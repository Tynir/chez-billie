# Chez Billie : mise en route

Calendrier partagé pour deux téléphones (Samsung + iPhone), avec 4 couleurs : toi, elle, « Nous » et Billie.
C'est une web app installable : un seul code, qui s'ajoute à l'écran d'accueil comme une vraie appli.

Tout est gratuit : Firebase (plan Spark) pour la synchro, GitHub Pages pour l'hébergement, GitHub Actions pour les rappels.
Compte environ 30 à 45 minutes, à faire depuis ton PC.

---

## Ce que contient le dossier

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'appli (interface, calendrier, dispos communes) |
| `firebase-config.js` | Les clés de ton projet Firebase, **à remplir** |
| `firestore.rules` | Qui a le droit de lire/écrire : vos deux e-mails, **à remplir** |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil, hors ligne, notifications |
| `notify/` + `.github/workflows/rappels.yml` | Envoi des rappels toutes les 10 minutes |

Tant que `firebase-config.js` n'est pas rempli, l'appli tourne en **mode démo** (données locales, exemples).

---

## 1. Créer le projet Firebase

1. Va sur <https://console.firebase.google.com> → **Créer un projet** → nom : `chez-billie`. Google Analytics : inutile, tu peux le désactiver.
2. Sur la page d'accueil du projet, clique sur l'icône **Web `</>`** → nom : `Chez Billie` → **Enregistrer l'appli** (ne coche pas Firebase Hosting).
3. Firebase affiche un bloc `const firebaseConfig = { ... }`. Copie chaque valeur dans `firebase-config.js` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

## 2. Créer vos deux comptes

1. Menu **Authentication** → **Commencer** → onglet **Sign-in method** → active **Adresse e-mail/Mot de passe**.
2. Onglet **Users** → **Ajouter un utilisateur** : ton e-mail + un mot de passe. Recommence pour elle.
   Elle pourra changer son mot de passe avec « Mot de passe oublié » sur l'écran de connexion.

## 3. Créer la base de données

1. Menu **Firestore Database** → **Créer une base de données** → emplacement **europe-west9 (Paris)** → **mode production**.
2. Ouvre `firestore.rules`, remplace les deux adresses par les vôtres **en minuscules**.
3. Dans Firestore → onglet **Règles**, efface tout, colle le contenu de `firestore.rules` → **Publier**.

## 4. Clé pour les notifications

**Paramètres du projet** (roue dentée) → onglet **Cloud Messaging** → section **Configuration Web** → **Certificats Web Push** → **Générer une paire de clés**.
Copie la clé dans `firebase-config.js`, à la ligne `FIREBASE_VAPID_KEY`.

## 5. Mettre l'appli en ligne (GitHub Pages)

1. Crée un compte sur <https://github.com> si besoin, puis **New repository** → nom `chez-billie` → **Public** → Create.
   Public est nécessaire pour Pages et Actions gratuits sans limite. Vos événements ne sont **pas** dans le dépôt : ils sont dans Firebase, protégés par les règles.
2. **Add file → Upload files** → glisse **tout le contenu** du dossier (y compris le dossier `.github` ; sous Windows, s'il n'apparaît pas, active « Éléments masqués » dans l'Explorateur) → **Commit changes**.
3. **Settings → Pages** → Source : *Deploy from a branch* → Branch : `main`, dossier `/ (root)` → Save.
   Au bout d'une minute, l'adresse s'affiche : `https://TON-PSEUDO.github.io/chez-billie/`.
4. Retour dans Firebase → **Authentication → Settings → Domaines autorisés** → **Ajouter** `TON-PSEUDO.github.io`.

## 6. Activer les rappels

1. Firebase → **Paramètres du projet → Comptes de service** → **Générer une nouvelle clé privée**. Un fichier `.json` se télécharge.
   C'est un secret : ne le mets **jamais** dans le dépôt.
2. GitHub → ton dépôt → **Settings → Secrets and variables → Actions** :
   - onglet **Secrets** → **New repository secret** → nom `FIREBASE_SERVICE_ACCOUNT` → colle **tout** le contenu du `.json`.
   - onglet **Variables** → **New repository variable** → nom `APP_URL` → ton adresse GitHub Pages.
3. Onglet **Actions** du dépôt → si GitHub demande, active les workflows → **Rappels Chez Billie → Run workflow** pour tester. La ligne doit passer au vert.
4. Tu peux supprimer le `.json` de ton PC une fois collé.

## 7. Installer sur vos téléphones

**Samsung (toi)** : ouvre l'adresse dans **Chrome** → menu ⋮ → **Installer l'appli** (ou « Ajouter à l'écran d'accueil »).

**iPhone (elle)** : ouvre l'adresse dans **Safari** → bouton **Partager** → **Sur l'écran d'accueil**. Il faut iOS 16.4 ou plus récent.

Ensuite, chacun sur son téléphone, **en ouvrant l'appli depuis l'icône** :
1. Se connecter.
2. **Réglages → Je suis** : choisir son prénom.
3. **Réglages → Prénoms** : mettre vos vrais prénoms (une seule fois, c'est partagé).
4. **Réglages → Activer les rappels** → accepter les notifications.

---

## Comment ça marche au quotidien

- **4 couleurs** au choix : Réglages → touche la pastille à côté d’un prénom → choisis parmi 12 teintes. Le choix est partagé entre vos deux téléphones ; prendre une couleur déjà utilisée échange les deux. Les puces en haut du calendrier masquent/affichent une catégorie.
- **Événements de nuit** : un concert 20:00 → 02:00 est géré, la fin est comptée sur le lendemain.
- **Plusieurs jours** : coche « Toute la journée » puis remplis « Jusqu'au » (tournée, week-end…).
- **Dispos communes** : créneaux où vous êtes libres tous les deux. Vos événements perso et « Nous » comptent comme occupés, ceux de Billie non.
- **Rappels** : un événement perso prévient la personne concernée ; « Nous » et Billie préviennent les deux.
  Ils partent toutes les 10 minutes environ (GitHub ajoute parfois quelques minutes de retard) : prévois une marge.
- **Hors ligne** : l'appli s'ouvre sans réseau, et ce que vous ajoutez se synchronise au retour de la connexion.

## Bon à savoir

- **Mettre à jour l'appli** : modifie le fichier sur GitHub (icône crayon) → Commit. La nouvelle version arrive à la prochaine ouverture.
- **Rappels en pause** : GitHub désactive les tâches planifiées d'un dépôt sans aucun commit pendant 60 jours, et t'envoie un e-mail avant. Pour relancer : onglet Actions → **Enable workflow**.
- **Notifications muettes sur iPhone** : vérifier Réglages iPhone → Notifications → Chez Billie, et que l'appli a bien été ouverte depuis l'icône (pas depuis Safari).
- **« Lecture impossible » à l'ouverture** : les e-mails dans les règles Firestore ne correspondent pas exactement à vos comptes (majuscules, faute de frappe).
- **Coût** : à votre échelle, vous restez très loin des limites gratuites de Firebase et de GitHub.
