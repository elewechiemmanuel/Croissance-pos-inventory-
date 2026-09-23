import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

// Inside your AuthProvider component:
  const login = async (email: string, pass: string) => {
    try {
      // Authenticate directly with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;

      // Create user session object for your app
      const appUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        name: firebaseUser.email?.includes("admin") ? "Administrator" : "Manager",
        role: firebaseUser.email?.includes("admin") ? "admin" : "manager"
      };

      setUser(appUser);
      localStorage.setItem("croissance_user", JSON.stringify(appUser));
    } catch (error: any) {
      console.error("Firebase login failed:", error);
      throw new Error(error.message || "Invalid email or password.");
    }
  };