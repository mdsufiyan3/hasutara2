import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCFTWh3Cjjhw1pLHtgXpCe4UWYEjRbS3LE",
    authDomain: "hasutara-48cff.firebaseapp.com",
    projectId: "hasutara-48cff",
    storageBucket: "hasutara-48cff.firebasestorage.app",
    messagingSenderId: "984362106060",
    appId: "1:984362106060:web:c5e56c9f42cd49bb8f5669",
    measurementId: "G-7B8SPVLCXY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Firebase initialized with config:', db.app.options);

<<<<<<< HEAD
export { db };
=======
export { db };
>>>>>>> a7cc94ac0ae81d78165305c0e8c664e7e5e76fbf
