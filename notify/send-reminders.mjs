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

let sent = 0;
for (const doc of eventsSnap.docs) {
  const e = doc.data();
  if (e.reminderSent) continue;
  const targets = tokensFor(e.who);
  const when = e.allDay ? `${fmtDate(e.date)} (journée)` : `${fmtDate(e.date)} à ${e.start}`;
  const body = `${names[e.who] || e.who} · ${when}${e.notes ? '\n' + e.notes.slice(0, 120) : ''}`;

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
  await doc.ref.update({ reminderSent: true });
}

console.log(`${eventsSnap.size} rappel(s) dû(s), ${sent} notification(s) envoyée(s).`);
