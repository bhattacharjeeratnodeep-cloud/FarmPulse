// ============ FIREBASE CONFIGURATION ============
// Go to Firebase Console → Project Settings → Your apps → SDK setup
// Replace these values with your actual Firebase config

const firebaseConfig = {
  apiKey: "AIzaSyAuREBelY3XF_mzy_plW4c4Kio3zuZe7I0",
  authDomain: "farmpulse9.firebaseapp.com",
  projectId: "farmpulse9",
  storageBucket: "farmpulse9.firebasestorage.app",
  messagingSenderId: "44319403169",
  appId: "1:44319403169:web:bbdb06bcf476847633d4e0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
window.auth = auth;
window.db = db;