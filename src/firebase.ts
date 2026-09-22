import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8KLVY_UDCYDi6-kKTgpAoctMndSx9LNI",
  authDomain: "croissance-inventory.firebaseapp.com",
  projectId: "croissance-inventory",
  storageBucket: "croissance-inventory.appspot.com",
  messagingSenderId: "102839485768",
  appId: "1:102839485768:web:abcdef123456"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with offline persistence enabled
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});