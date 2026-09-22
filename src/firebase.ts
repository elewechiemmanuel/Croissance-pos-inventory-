import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8KLVY_UDCYDi6-kKTgpAoctMndSx9LNI",
  authDomain: "croissance-inventory.firebaseapp.com",
  projectId: "croissance-inventory",
  storageBucket: "croissance-inventory.appspot.com",
  messagingSenderId: "102839485768", // or your specific sender id if known, or leave as placeholder if optional
  appId: "1:102839485768:web:abcdef123456"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});