// Firebase Configuration for Frontend
const firebaseConfig = {
    apiKey: "AIzaSyD5t5yW9FZ0k5mVlY7N8vqQJvJwZfVBaSqA",
    authDomain: "agri-negotiate.firebaseapp.com",
    projectId: "agri-negotiate",
    storageBucket: "agri-negotiate.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();