import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database"; // ⬅️ Changement ici

// Votre configuration Web Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC4Y2pbLhGmT2nNJ5bxLdWG2AoBecpvzLg",
  authDomain: "asrar-bc059.firebaseapp.com",
  databaseURL: "https://asrar-bc059.firebaseio.com", // URL de la Realtime Database
  projectId: "asrar-bc059",
  storageBucket: "asrar-bc059.appspot.com",
  messagingSenderId: "199810893447",
  appId: "1:199810893447:web:165ed3d51093d83c68da22",
  measurementId: "G-BN0JRDV2MG"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app); // ⬅️ Changement ici