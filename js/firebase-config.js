// Firebase configuration - Replace with your own Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyB02to1jBasAq8QB4V_77Xkw7_6vnl4-zI",
    authDomain: "hostel-a129c.firebaseapp.com",
    databaseURL: "https://hostel-a129c-default-rtdb.firebaseio.com",
    projectId: "hostel-a129c",
    storageBucket: "hostel-a129c.firebasestorage.app",
    messagingSenderId: "1095342104914",
    appId: "1:1095342104914:web:344c8a6f704b1c47b95a8b",
    measurementId: "G-1ZHL3231E9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to Firebase services
const auth = firebase.auth();
const database = firebase.database();

// Export for use in other modules
window.firebaseServices = { auth, database };
