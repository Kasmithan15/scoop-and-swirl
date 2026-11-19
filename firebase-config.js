// =====================================================================
// FIREBASE SETTINGS
// 1. Create a project at https://console.firebase.google.com
// 2. Add a Web app, copy its "firebaseConfig" values below
//    (replace null with the object).
// 3. Set ADMIN_EMAIL to the email of the admin account you create in
//    Firebase Authentication, and use the SAME email in firestore.rules.
//
// While the config is null, the site runs in demo mode (data stays in
// each visitor's browser).
// These values are safe to publish: Firebase protects data with the
// rules in firestore.rules, not by hiding this config.
// =====================================================================
window.SCOOP_FIREBASE_CONFIG = null;
/* Example:
window.SCOOP_FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "scoop-and-swirl.firebaseapp.com",
  projectId: "scoop-and-swirl",
  storageBucket: "scoop-and-swirl.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
*/
window.SCOOP_ADMIN_EMAIL = 'icecream@gmail.com';
