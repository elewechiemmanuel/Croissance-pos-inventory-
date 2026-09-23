import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "../types";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (email: string, fullName: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  sendHeartbeat: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sendHeartbeat = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Background heartbeat
    } catch (e) {}
  }, [user?.id]);

  useEffect(() => {
    const storedUser = localStorage.getItem("croissance_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch (e) {}
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;

      let fullName = firebaseUser.displayName || email.split("@")[0];
      // Updated role type definition to include "cashier" from your Firestore records
      let role: "admin" | "user" | "manager" | "cashier" = "user";

      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.fullName) fullName = data.fullName;
          if (data.role) role = data.role;
        }
      } catch (err) {
        console.warn("Could not fetch user profile from Firestore, falling back to defaults.", err);
      }

      const appUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        fullName: fullName,
        name: fullName,
        role: role
      };

      setUser(appUser);
      localStorage.setItem("croissance_user", JSON.stringify(appUser));
    } catch (error: any) {
      console.error("Firebase login failed:", error);
      throw new Error(error.message || "Invalid email or password.");
    }
  };

  const loginWithGoogle = async (email: string, fullName: string) => {
    const appUser: User = {
      id: "google_" + Date.now(),
      email,
      fullName: fullName,
      name: fullName,
      role: email.includes("admin") ? "admin" : "user"
    };
    setUser(appUser);
    localStorage.setItem("croissance_user", JSON.stringify(appUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("croissance_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, isLoading, sendHeartbeat }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    let fallbackUser: User | null = null;
    try {
      const stored = localStorage.getItem("croissance_user");
      if (stored) {
        fallbackUser = JSON.parse(stored);
      }
    } catch (e) {}

    return {
      user: fallbackUser,
      login: async () => {},
      loginWithGoogle: async () => {},
      logout: () => {},
      isLoading: false,
      sendHeartbeat: async () => {}
    };
  }
  return context;
};