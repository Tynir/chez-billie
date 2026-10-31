// Configuration Firebase de « Chez Billie ».
// Tant que apiKey vaut "A_REMPLIR", l'appli tourne en mode démo (données locales).
// Colle ici les valeurs de : Console Firebase > Paramètres du projet > Général > Vos applications > Config.
// Ces valeurs ne sont pas secrètes : la sécurité vient des règles Firestore (firestore.rules).
self.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDe0zz-fKplLEDRZ-jlSWuGyhZ1nI7qmNQ",
  authDomain: "chez-billie.firebaseapp.com",
  projectId: "chez-billie",
  storageBucket: ""chez-billie.firebasestorage.app",
  messagingSenderId: "1046006893986",
  appId: "1:1046006893986:web:807472e490e3067a38f6fb"
};

// Clé VAPID pour les notifications :
// Paramètres du projet > Cloud Messaging > Configuration Web > Certificats Web Push > Générer une paire de clés.
self.FIREBASE_VAPID_KEY = "BPMfCdhNb53ZD-Dpv4hn3tkJbR0g5EnIDZOqV1l-o-ofHZsXQcebeZdyG1G4oIQ8zZLltV8TcRhFRG7p0_653wU";
