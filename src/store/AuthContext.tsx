import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { User } from "../types";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { auth, db } from "../firebase";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (
    email: string,
    fullName: string
  ) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  sendHeartbeat: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

type AppRole =
  | "admin"
  | "user"
  | "manager"
  | "cashier";

// 🔑 Whitelist of absolute admin emails
const ADMIN_EMAILS = ["admin@croissance.com"];

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Make sure only valid application roles are accepted.
   */
  const getValidRole = (role: any): AppRole => {
    if (
      role === "admin" ||
      role === "manager" ||
      role === "cashier" ||
      role === "user"
    ) {
      return role;
    }

    return "user";
  };

  /**
   * Load the user's profile from Firestore, or auto-create it if missing.
   */
  const loadUserProfile = async (
    firebaseUser: any
  ): Promise<User> => {
    let fullName =
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "User";

    // 🛡️ Bulletproof email normalization (removes accidental spaces & lowercase)
    const emailClean = (firebaseUser.email || "").trim().toLowerCase();

    // Force admin status if email matches whitelist or contains "admin"
    const isAdminEmail =
      ADMIN_EMAILS.includes(emailClean) || emailClean.includes("admin");

    let role: AppRole = isAdminEmail ? "admin" : "user";

    try {
      const userDocRef = doc(
        db,
        "users",
        firebaseUser.uid
      );

      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();

        if (data.fullName) {
          fullName = data.fullName;
        }

        if (data.name && !data.fullName) {
          fullName = data.name;
        }

        // 🔑 CRITICAL FIX: If it's an admin email, FORCE "admin". Never let Firestore downgrade an admin.
        if (isAdminEmail) {
          role = "admin";
        } else {
          role = getValidRole(data.role);
        }

        console.log("Firestore user profile data:", data);
        console.log("Determined user role:", role);
      } else {
        // 🔥 AUTO-HEALING: Create missing user document instantly
        role = isAdminEmail ? "admin" : "user";

        await setDoc(userDocRef, {
          email: firebaseUser.email || "",
          fullName: fullName,
          role: role,
          status: "Active",
          createdAt: serverTimestamp(),
        });

        console.log("Auto-created user document for UID:", firebaseUser.uid, "with role:", role);
      }
    } catch (error) {
      console.error("Error loading/creating user profile:", error);
    }

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || "",
      fullName,
      name: fullName,
      role,
    };
  };

  /**
   * Firebase authentication state listener.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const appUser = await loadUserProfile(firebaseUser);
            setUser(appUser);
            localStorage.setItem(
              "croissance_user",
              JSON.stringify(appUser)
            );
          } else {
            setUser(null);
            localStorage.removeItem("croissance_user");
          }
        } catch (error) {
          console.error("Authentication state error:", error);
          setUser(null);
          localStorage.removeItem("croissance_user");
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  /**
   * Background heartbeat.
   */
  const sendHeartbeat = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Background heartbeat
    } catch (e) {
      console.error("Heartbeat error:", e);
    }
  }, [user?.id]);

  /**
   * Email/password login.
   */
  const login = async (
    email: string,
    pass: string
  ) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        pass
      );

      const firebaseUser = userCredential.user;
      const appUser = await loadUserProfile(firebaseUser);

      console.log("Logged-in application user:", appUser);

      setUser(appUser);
      localStorage.setItem(
        "croissance_user",
        JSON.stringify(appUser)
      );
    } catch (error: any) {
      console.error("Firebase login failed:", error);
      throw new Error(
        error.message || "Invalid email or password."
      );
    }
  };

  /**
   * Google login.
   */
  const loginWithGoogle = async (
    email: string,
    fullName: string
  ) => {
    const emailClean = email.trim().toLowerCase();
    const appUser: User = {
      id: "google_" + Date.now(),
      email,
      fullName,
      name: fullName,
      role: ADMIN_EMAILS.includes(emailClean) || emailClean.includes("admin")
        ? "admin"
        : "user",
    };

    setUser(appUser);
    localStorage.setItem(
      "croissance_user",
      JSON.stringify(appUser)
    );
  };

  /**
   * Proper Firebase logout.
   */
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase logout error:", error);
    }

    setUser(null);
    localStorage.removeItem("croissance_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithGoogle,
        logout,
        isLoading,
        sendHeartbeat,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    return {
      user: null,
      login: async () => {},
      loginWithGoogle: async () => {},
      logout: () => {},
      isLoading: false,
      sendHeartbeat: async () => {},
    };
  }

  return context;
};