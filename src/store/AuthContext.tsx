import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "../types";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

function getClientDeviceInfo(): string {
  const ua = navigator.userAgent;
  let os = "Desktop";
  if (/windows/i.test(ua)) os = "Windows PC";
  else if (/macintosh|mac os/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android Mobile";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS Device";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/edg/i.test(ua)) browser = "Edge";

  return `${browser} (${os})`;
}

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

  const loginWithGoogle = async (email: string, fullName: string) => {
    const appUser: User = {
      id: "google_" + Date.now(),
      email,
      name: fullName,
      role: email.includes("admin") ? "admin" : "manager"
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