import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyCFTWh3Cjjhw1pLHtgXpCe4UWYEjRbS3LE",
    authDomain: "hasutara-48cff.firebaseapp.com",
    projectId: "hasutara-48cff",
    storageBucket: "hasutara-48cff.firebasestorage.app",
    messagingSenderId: "984362106060",
    appId: "1:984362106060:web:c5e56c9f42cd49bb8f5669",
    measurementId: "G-7B8SPVLCXY"
};

let auth;
let db;
let analytics;

try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);

    // Enhanced localhost configuration
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Running in development mode');
        auth.useDeviceLanguage();
        auth.settings = {
            popupRedirectResolver: undefined,
            authDomain: 'hasutara-48cff.firebaseapp.com' // Use your Firebase auth domain
        };
    } else if (!firebaseConfig.authDomain.includes(window.location.hostname)) {
        console.warn('Current domain not authorized for authentication:', window.location.hostname);
    }

    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    alert('Failed to initialize Firebase. Please check your connection.');
}

export { auth, db, analytics };