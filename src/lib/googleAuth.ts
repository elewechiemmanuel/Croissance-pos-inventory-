import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App instance safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const TARGET_GOOGLE_EMAIL = "admincroissance@gmail.com";

// Configure Google Provider with the authorized Workspace scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/spreadsheets");
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");
googleProvider.setCustomParameters({
  prompt: "select_account",
  access_type: "offline",
  login_hint: TARGET_GOOGLE_EMAIL
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is authenticated in Firebase, but access token needs refresh or re-auth for Google APIs
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Custom error class for cancelled or closed popups
export class GoogleAuthCancelledError extends Error {
  code = "auth/popup-closed-by-user";
  isCancelled = true;
  constructor(message = "Google sign-in popup was closed.") {
    super(message);
    this.name = "GoogleAuthCancelledError";
  }
}

// Basic Sign in with Google (Authentication only - NO sensitive scopes, never blocked by unverified scope checks)
export const signInWithGoogleBasic = async (targetEmail: string = TARGET_GOOGLE_EMAIL): Promise<{ user: User }> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    
    const params: Record<string, string> = {
      prompt: "select_account"
    };
    if (targetEmail) {
      params.login_hint = targetEmail;
    }
    provider.setCustomParameters(params);

    const result = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (error: any) {
    const errCode = error?.code || "";
    const errMsg = String(error?.message || "");
    if (
      errCode === "auth/popup-closed-by-user" || 
      errCode === "auth/cancelled-popup-request" ||
      errMsg.includes("popup-closed-by-user") ||
      errMsg.includes("cancelled-popup-request")
    ) {
      // Normal user action or popup close - do not log as console.error
      console.info("Google sign-in popup was closed by user.");
      const cancelledErr = new GoogleAuthCancelledError("Google sign-in window was closed. Click again when ready.");
      throw cancelledErr;
    }
    if (errCode === "auth/popup-blocked" || errMsg.includes("popup-blocked")) {
      console.warn("Google basic sign-in popup was blocked by browser.");
      const customErr: any = new Error("Popup blocked by browser. Please allow popups or open the app in a new tab.");
      customErr.code = error.code;
      customErr.isPopupBlocked = true;
      throw customErr;
    }
    console.error("Google basic sign-in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign in with Google Popup (with Sheets & Drive Workspace scopes)
export const signInWithGoogle = async (targetEmail: string = TARGET_GOOGLE_EMAIL): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/spreadsheets");
    provider.addScope("https://www.googleapis.com/auth/drive.file");
    
    const params: Record<string, string> = {
      prompt: "select_account",
      access_type: "offline"
    };
    if (targetEmail) {
      params.login_hint = targetEmail;
    }
    provider.setCustomParameters(params);

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve Google OAuth access token from authentication result.");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const errCode = error?.code || "";
    const errMsg = String(error?.message || "");
    if (
      errCode === "auth/popup-closed-by-user" || 
      errCode === "auth/cancelled-popup-request" ||
      errMsg.includes("popup-closed-by-user") ||
      errMsg.includes("cancelled-popup-request")
    ) {
      // Normal user action or popup close - do not log as console.error
      console.info("Google sign-in popup was closed by user.");
      const cancelledErr = new GoogleAuthCancelledError("Google sign-in window was closed. Click again when ready.");
      throw cancelledErr;
    }
    if (errCode === "auth/popup-blocked" || errMsg.includes("popup-blocked")) {
      console.warn("Google sign-in popup was blocked by browser.");
      const customErr: any = new Error("Sign-in popup blocked by browser. Please allow popups or open the app in a new tab.");
      customErr.code = error.code;
      customErr.isPopupBlocked = true;
      throw customErr;
    }
    if (errMsg.includes("verification") || errMsg.includes("Access blocked") || errCode === "auth/admin-restricted-operation") {
      console.warn("Google OAuth restricted to Test Users:", error);
      const customErr: any = new Error("Access blocked by Google: admincroissance@gmail.com must be added to 'Test users' in Google Cloud Console for project gen-lang-client-0852291573.");
      customErr.code = error?.code;
      throw customErr;
    }
    console.error("Google sign-in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Access token getter
export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Sign out from Google Auth
export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
