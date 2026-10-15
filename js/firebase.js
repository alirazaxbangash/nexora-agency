// Nexora Agency Firebase setup (Firebase Web SDK v11.10.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB9Ut2CJQ638Ekgp9crr0_4-Ixdqf8Sp3A",
  authDomain: "nexora-agency-9dd7d.firebaseapp.com",
  projectId: "nexora-agency-9dd7d",
  storageBucket: "nexora-agency-9dd7d.firebasestorage.app",
  messagingSenderId: "721843717497",
  appId: "1:721843717497:web:877470c5ab91a8eb20dba8",
  measurementId: "G-YG3ZH971VL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
