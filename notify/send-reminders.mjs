// Envoie les rappels dus. Lancé toutes les 10 minutes par GitHub Actions (.github/workflows/rappels.yml).
// Qui reçoit quoi : événement perso -> la personne concernée ; « Nous » et Billie -> vous deux.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (!sa.project_id) {
  console.error('Secret FIREBASE_SERVICE_ACCOUNT manquant ou invalide.');
  process.exit(1);
}
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const messaging = getMessaging();

const APP_URL = process.env.APP_URL || '';
const now = new Date();
// On rattrape jusqu'à 6 h de retard (GitHub peut décaler les tâches planifiées).
const from = Timestamp.fromDate(new Date(now.getTime() - 6 * 3600 * 1000));
const to = Timestamp.fromDate(now);

const [eventsSnap, usersSnap, configSnap] = await Promise.all([
  db.collection('events').where('remindAt', '>=', from).where('remindAt', '<=', to).get(),
  db.collection('users').get(),
  db.doc('config/foyer').get(),
]);

const names = { p1: 'Lui', p2: 'Elle', nous: 'Nous', billie: 'Billie', ...(configSnap.data()?.names || {}) };
const users = usersSnap.docs.map((d) => ({ ref: d.ref, ...d.data() }));
const tokensFor = (who) => {
  const list = users.filter((u) => who === 'nous' || who === 'billie' || u.person === who);
  return list.flatMap((u) => (u.tokens || []).map((t) => ({ t, ref: u.ref })));
};

const fmtDate = (ymd) => new Date(ymd + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });

// ----- Dates (calculées à l'heure de Paris, le serveur tourne en UTC) -----
const pad = (n) => String(n).padStart(2, '0');
const toUtc = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const fromUtc = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
const addDays = (ymd, n) => { const d = toUtc(ymd); d.setUTCDate(d.getUTCDate() + n); return fromUtc(d); };
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const parisYmd = (dt) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
function parisOffset(ts) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ts));
  const g = (t) => Number(p.find((x) => x.type === t).value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute')) - Math.floor(ts / 60000) * 60000;
}
function parisTime(ymd, mins) {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, mins);
  let t = guess - parisOffset(guess);
  const o2 = parisOffset(t); if (guess - o2 !== t) t = guess - o2;
  return new Date(t);
}

// ----- Récurrence (même logique que l'appli) -----
const hasRepeat = (e) => !!(e.repeat && e.repeat.freq && e.repeat.freq !== 'none');
function isStart(e, d) {
  if (d < e.date) return false;
  if (!hasRepeat(e)) return d === e.date;
  const r = e.repeat;
  if (r.until && d > r.until) return false;
  if ((e.exdates || []).includes(d)) return false;
  const iv = Math.max(1, Number(r.interval) || 1);
  const a = toUtc(e.date), b = toUtc(d);
  let idx;
  if (r.freq === 'daily' || r.freq === 'weekly') {
    const step = r.freq === 'daily' ? iv : 7 * iv;
    const diff = Math.round((b - a) / 864e5);
    if (diff % step) return false;
    idx = diff / step;
  } else if (r.freq === 'monthly') {
    if (b.getUTCDate() !== a.getUTCDate()) return false;
    const md = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    if (md % iv) return false;
    idx = 0;
    for (let m = 0; m < md; m += iv) if (new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + m, a.getUTCDate())).getUTCDate() === a.getUTCDate()) idx++;
  } else if (r.freq === 'yearly') {
    if (b.getUTCDate() !== a.getUTCDate() || b.getUTCMonth() !== a.getUTCMonth()) return false;
    const yd = b.getUTCFullYear() - a.getUTCFullYear();
    if (yd % iv) return false;
    idx = 0;
    for (let y = 0; y < yd; y += iv) if (new Date(Date.UTC(a.getUTCFullYear() + y, a.getUTCMonth(), a.getUTCDate())).getUTCMonth() === a.getUTCMonth()) idx++;
  } else return d === e.date;
  return !(r.count && idx >= Number(r.count));
}
function nextRemind(e, now) {
  if (!hasRepeat(e) || e.reminder === '' || e.reminder == null) return null;
  const at = (occ) => new Date(parisTime(occ, e.allDay ? 9 * 60 : toMin(e.start)).getTime() - Number(e.reminder) * 60000);
  const today = parisYmd(now);
  let d = today > e.date ? addDays(today, -3) : e.date;
  for (let i = 0; i < 4000; i++, d = addDays(d, 1)) {
    if (e.repeat.until && d > e.repeat.until) return null;
    if (isStart(e, d)) { const t = at(d); if (t > now) return { at: t, occ: d }; }
  }
  return null;
}

let sent = 0;
for (const doc of eventsSnap.docs) {
  const e = doc.data();
  if (e.reminderSent) continue;
  const targets = tokensFor(e.who);
  const occ = e.remindOcc || e.date;
  const span = e.endDate && e.endDate > e.date ? Math.round((toUtc(e.endDate) - toUtc(e.date)) / 864e5) : 0;
  const when = e.allDay ? `${fmtDate(occ)} (journée)` : `${fmtDate(occ)} à ${e.start}`;
  const until = span ? ` → ${fmtDate(addDays(occ, span))}${!e.allDay && e.end ? ' à ' + e.end : ''}` : '';
  const body = `${names[e.who] || e.who} · ${when}${until}${e.notes ? '\n' + e.notes.slice(0, 120) : ''}`;

  for (const { t, ref } of targets) {
    try {
      await messaging.send({
        token: t,
        notification: { title: e.title, body },
        webpush: APP_URL ? { fcmOptions: { link: APP_URL } } : undefined,
      });
      sent++;
    } catch (err) {
      const code = err?.errorInfo?.code || err?.code || '';
      // Jeton périmé (appli désinstallée, notifications coupées) : on le retire.
      if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
        const u = users.find((x) => x.ref.path === ref.path);
        if (u) { u.tokens = (u.tokens || []).filter((x) => x !== t); await ref.update({ tokens: u.tokens }); }
      } else {
        console.error('Envoi échoué :', code || err);
      }
    }
  }
  // Événement récurrent : on programme le rappel de la prochaine occurrence.
  const next = nextRemind(e, now);
  if (next) await doc.ref.update({ remindAt: Timestamp.fromDate(next.at), remindOcc: next.occ, reminderSent: false });
  else await doc.ref.update({ reminderSent: true });
}

console.log(`${eventsSnap.size} rappel(s) dû(s), ${sent} notification(s) envoyée(s).`);
