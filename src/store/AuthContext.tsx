import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "../types";
import { apiCall } from "../lib/api";

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

  // Send heartbeat to indicate user is active
  const sendHeartbeat = useCallback(async () => {
    if (!user?.id) return;
    try {
      await apiCall("heartbeat", { 
        userId: user.id,
        deviceInfo: getClientDeviceInfo(),
        station: user.role === "admin" ? "Admin Office" : "Station POS Terminal"
      });
    } catch (e) {
      // Non-blocking background heartbeat
    }
  }, [user?.id, user?.role]);

  // Load stored user on mount
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

  // Set up periodic heartbeat while user is logged in
  useEffect(() => {
    if (!user?.id) return;

    // Immediately signal online on initial load
    sendHeartbeat();

    // Heartbeat every 45 seconds to keep session online
    const interval = setInterval(() => {
      sendHeartbeat();
    }, 45000);

    // Keep active on window visibility restoration
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id, sendHeartbeat]);

  const login = async (email: string, pass: string) => {
    const deviceInfo = getClientDeviceInfo();
    const res = await apiCall("login", { 
      email, 
      password: pass,
      deviceInfo,
      station: "Croissance Station Terminal"
    });
    if (res.user) {
      setUser(res.user);
      localStorage.setItem("croissance_user", JSON.stringify(res.user));
    }
  };

  const loginWithGoogle = async (email: string, fullName: string) => {
    const deviceInfo = getClientDeviceInfo();
    const res = await apiCall("googleLogin", { 
      email, 
      fullName,
      deviceInfo,
      station: "Croissance Web Portal"
    });
    if (res.user) {
      setUser(res.user);
      localStorage.setItem("croissance_user", JSON.stringify(res.user));
    }
  };

  const logout = () => {
    if (user?.id) {
      apiCall("logout", { userId: user.id }).catch(() => {});
    }
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
    // Safe fallback object prevents React context boundary crashes during checkout
    let fallbackUser: User | null = null;
    try {
      const stored = localStorage.getItem("croissance_user");
      if (stored) {
        fallbackUser = JSON.parse(stored);
      }
    } catch (e) {
      // ignore parse errors
    }

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