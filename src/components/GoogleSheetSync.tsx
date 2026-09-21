import React, { useState, useEffect } from "react";
import { 
  signInWithGoogle, 
  getGoogleAccessToken, 
  initGoogleAuth, 
  googleSignOut,
  TARGET_GOOGLE_EMAIL,
  GoogleAuthCancelledError
} from "../lib/googleAuth";
import { 
  createSpreadsheetForApp, 
  syncDataToGoogleSheet, 
  loadDataFromGoogleSheet, 
  getStoredSheetInfo, 
  saveStoredSheetInfo,
  LinkedSheetInfo,
  fetchSpreadsheetMetadata
} from "../lib/googleSheets";
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  Link as LinkIcon, 
  Unlink, 
  HelpCircle,
  Database,
  ArrowDownToLine,
  ArrowUpToLine,
  Layers,
  Mail,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Globe,
  Save
} from "lucide-react";
import { apiCall } from "../lib/api";

interface GoogleSheetSyncProps {
  appData: any;
  onRefreshLocalData?: () => Promise<void>;
}

export default function GoogleSheetSync({ appData, onRefreshLocalData }: GoogleSheetSyncProps) {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getGoogleAccessToken());
  const [linkedSheet, setLinkedSheet] = useState<LinkedSheetInfo | null>(getStoredSheetInfo());
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Manual link form
  const [manualSheetInput, setManualSheetInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Web App URL Configuration
  const [webAppUrl, setWebAppUrl] = useState(
    localStorage.getItem("google_sheets_web_app_url") || appData?.settings?.googleSheetsWebAppUrl || ""
  );
  const [showWebAppConfig, setShowWebAppConfig] = useState(false);
  const [isSavingWebApp, setIsSavingWebApp] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showOAuthBlockedGuide, setShowOAuthBlockedGuide] = useState(false);

  // Confirmation modal for sync
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const notify = (type: 'success' | 'error' | 'info', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleGoogleSignIn = async (targetEmail: string = TARGET_GOOGLE_EMAIL) => {
    setLoading(true);
    try {
      const res = await signInWithGoogle(targetEmail);
      setGoogleUser(res.user);
      setAccessToken(res.accessToken);
      notify("success", `Connected with Google as ${res.user.email}`);
    } catch (err: any) {
      if (err instanceof GoogleAuthCancelledError || err?.isCancelled || err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        notify("info", "Google sign-in popup was closed. Click connect whenever you're ready.");
        return;
      }
      if (err?.isPopupBlocked || err?.code === "auth/popup-blocked") {
        notify("error", "Sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab.");
        return;
      }
      const errMsg = err?.message || "";
      if (errMsg.includes("verification") || errMsg.includes("Test users") || errMsg.includes("blocked")) {
        setShowOAuthBlockedGuide(true);
      }
      notify("error", errMsg || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setAccessToken(null);
    notify("success", "Disconnected from Google account.");
  };

  // Build brand-new Google Sheet
  const handleBuildNewGoogleSheet = async () => {
    let token = accessToken || getGoogleAccessToken();
    if (!token) {
      try {
        const signResult = await signInWithGoogle(TARGET_GOOGLE_EMAIL);
        token = signResult.accessToken;
        setGoogleUser(signResult.user);
        setAccessToken(token);
      } catch (err: any) {
        if (err instanceof GoogleAuthCancelledError || err?.isCancelled || err?.code === "auth/popup-closed-by-user") {
          notify("info", "Sign-in popup was closed. Connect Google account to create the spreadsheet.");
        } else {
          notify("error", err?.message || "Google authentication required to create spreadsheet.");
        }
        return;
      }
    }

    setLoading(true);
    try {
      const sheet = await createSpreadsheetForApp(token, appData);
      setLinkedSheet(sheet);
      notify("success", `Google Sheet "${sheet.title}" built and linked successfully in Google Drive!`);
    } catch (err: any) {
      console.error(err);
      notify("error", err.message || "Could not build Google Sheet.");
    } finally {
      setLoading(false);
    }
  };

  // Save Apps Script Web App URL
  const handleSaveWebAppUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebApp(true);
    try {
      const trimmed = webAppUrl.trim();
      localStorage.setItem("google_sheets_web_app_url", trimmed);
      await apiCall("updateSettings", { googleSheetsWebAppUrl: trimmed });
      notify("success", "Google Apps Script Web App URL updated successfully!");
    } catch (err: any) {
      notify("error", err.message || "Failed to save Web App URL.");
    } finally {
      setIsSavingWebApp(false);
    }
  };

  // Sync to Sheet with Confirmation
  const triggerSyncToSheet = () => {
    if (!linkedSheet) return;
    setConfirmModal({
      isOpen: true,
      title: "Sync All 9 Modules to Google Sheet?",
      message: `This will synchronize all 9 modules ('Products', 'Sales', 'Invoices', 'Waybills', 'Customers', 'CreditLedger', 'Purchases', 'Users', 'Settings') in "${linkedSheet.title}" with your latest application data.`,
      action: async () => {
        let token = accessToken || getGoogleAccessToken();
        if (!token) {
          try {
            const res = await signInWithGoogle();
            token = res.accessToken;
            setGoogleUser(res.user);
            setAccessToken(token);
          } catch (err: any) {
            if (err instanceof GoogleAuthCancelledError || err?.isCancelled || err?.code === "auth/popup-closed-by-user") {
              notify("info", "Sync paused: Google sign-in popup was closed.");
              return;
            }
            throw err;
          }
        }
        const syncRes = await syncDataToGoogleSheet(token, linkedSheet.spreadsheetId, appData);
        setLinkedSheet(getStoredSheetInfo());
        notify(
          "success", 
          `Synced all 9 modules successfully! (Products: ${syncRes.details.products}, Sales: ${syncRes.details.sales}, Invoices: ${syncRes.details.invoices}, Waybills: ${syncRes.details.waybills}, Customers: ${syncRes.details.customers}, Credit Ledger: ${syncRes.details.creditLedger}, Purchases: ${syncRes.details.purchases}, Users: ${syncRes.details.users})`
        );
      }
    });
  };

  // Pull from Sheet with Confirmation
  const triggerPullFromSheet = () => {
    if (!linkedSheet) return;
    setConfirmModal({
      isOpen: true,
      title: "Load Data from Google Sheet?",
      message: `This will read records from "${linkedSheet.title}" to verify table entries.`,
      action: async () => {
        let token = accessToken || getGoogleAccessToken();
        if (!token) {
          try {
            const res = await signInWithGoogle();
            token = res.accessToken;
            setGoogleUser(res.user);
            setAccessToken(token);
          } catch (err: any) {
            if (err instanceof GoogleAuthCancelledError || err?.isCancelled || err?.code === "auth/popup-closed-by-user") {
              notify("info", "Operation paused: Google sign-in popup was closed.");
              return;
            }
            throw err;
          }
        }
        const data = await loadDataFromGoogleSheet(token, linkedSheet.spreadsheetId);
        if (onRefreshLocalData) {
          await onRefreshLocalData();
        }
        notify("success", `Loaded ${data.products.length} products and ${data.customers.length} customers from Google Sheet!`);
      }
    });
  };

  // Link existing spreadsheet ID or URL
  const handleLinkExistingSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetInput.trim()) return;

    let token = accessToken || getGoogleAccessToken();
    if (!token) {
      try {
        const signResult = await signInWithGoogle();
        token = signResult.accessToken;
        setGoogleUser(signResult.user);
        setAccessToken(token);
      } catch (err: any) {
        if (err instanceof GoogleAuthCancelledError || err?.isCancelled || err?.code === "auth/popup-closed-by-user") {
          notify("info", "Sign-in popup was closed. Google authentication is required to link spreadsheet.");
        } else {
          notify("error", err?.message || "Google authentication required to link spreadsheet.");
        }
        return;
      }
    }

    // Extract ID from URL if full URL is entered
    let sheetId = manualSheetInput.trim();
    const match = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      sheetId = match[1];
    }

    setLoading(true);
    try {
      const meta = await fetchSpreadsheetMetadata(token, sheetId);
      const newSheetInfo: LinkedSheetInfo = {
        spreadsheetId: sheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        title: meta.title,
        lastSync: new Date().toISOString()
      };
      saveStoredSheetInfo(newSheetInfo);
      setLinkedSheet(newSheetInfo);
      setShowManualInput(false);
      setManualSheetInput("");
      notify("success", `Linked to Google Sheet: "${meta.title}"`);
    } catch (err: any) {
      notify("error", err.message || "Failed to link Google Sheet. Check ID and permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkSheet = () => {
    if (confirm("Are you sure you want to unlink this Google Sheet from the app? The spreadsheet will remain in your Google Drive.")) {
      saveStoredSheetInfo(null);
      setLinkedSheet(null);
      notify("success", "Google Sheet unlinked.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Banner / Header */}
      <div className="p-6 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">Google Sheets Live Database</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Primary Database
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">
              Live Google Sheets integration linked to <strong>{TARGET_GOOGLE_EMAIL}</strong>
            </p>
          </div>
        </div>

        {/* Google Account Status Badge */}
        <div>
          {googleUser ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-blue-800/80 px-3.5 py-2 rounded-lg border border-blue-700/80">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
                <div className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-300 text-[10px]">Google Account</span>
                    {googleUser.email?.toLowerCase() === TARGET_GOOGLE_EMAIL.toLowerCase() && (
                      <span className="bg-emerald-500/25 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-semibold border border-emerald-400/30 flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> Target Owner
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-white truncate max-w-[200px] inline-block font-mono text-[11px]">
                    {googleUser.email}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-3 sm:border-l sm:border-blue-700">
                <button 
                  onClick={handleGoogleDisconnect} 
                  className="text-xs text-blue-300 hover:text-white underline cursor-pointer"
                >
                  Switch
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <button
                onClick={() => handleGoogleSignIn(TARGET_GOOGLE_EMAIL)}
                disabled={loading}
                className="gsi-material-button bg-white text-gray-800 px-3.5 py-2 rounded-lg font-medium text-xs flex items-center gap-2 shadow-md hover:bg-gray-50 transition-colors cursor-pointer border border-white"
                title={`Connect Google account: ${TARGET_GOOGLE_EMAIL}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Link <strong>{TARGET_GOOGLE_EMAIL}</strong></span>
              </button>

              <button
                onClick={() => handleGoogleSignIn("")}
                disabled={loading}
                className="text-[11px] text-blue-300 hover:text-white underline cursor-pointer px-1"
              >
                Other Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Target Account Notice Bar */}
      <div className="bg-amber-50/80 border-b border-amber-200/80 px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Designated Google Sheet Account: <strong className="font-mono text-amber-950">{TARGET_GOOGLE_EMAIL}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOAuthBlockedGuide(!showOAuthBlockedGuide)}
            className="text-red-700 hover:text-red-900 font-semibold flex items-center gap-1 cursor-pointer underline"
          >
            <span>Fix "Access Blocked" Error</span>
          </button>
          <span className="text-amber-300">•</span>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 cursor-pointer underline"
          >
            <span>Connection Guide</span>
            {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* OAuth Verification Troubleshooting Banner */}
      {showOAuthBlockedGuide && (
        <div className="bg-red-50/90 border-b border-red-200 p-5 text-xs text-red-950 space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-900 text-sm">
                  Fix: "Access blocked: gen-lang-client-0852291573.firebaseapp.com has not completed the Google verification process"
                </h4>
                <p className="text-red-800 mt-1 leading-relaxed">
                  Because this app requests Google Drive/Sheets scopes while in <strong>Testing mode</strong>, Google requires your account to be added to the <strong>Test users</strong> list in Google Cloud Console.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOAuthBlockedGuide(false)}
              className="text-xs text-red-700 hover:text-red-900 font-semibold cursor-pointer underline shrink-0"
            >
              Dismiss
            </button>
          </div>

          <div className="bg-white rounded-lg p-4 border border-red-200 shadow-2xs space-y-2">
            <p className="font-bold text-gray-900 text-xs">Steps to allow {TARGET_GOOGLE_EMAIL} as a tester:</p>
            <ol className="list-decimal pl-4 text-gray-700 text-xs space-y-1.5 leading-relaxed">
              <li>
                Open the Google Cloud Console for project <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px] text-blue-900">gen-lang-client-0852291573</code>:
                <div className="mt-1">
                  <a
                    href="https://console.cloud.google.com/apis/credentials/consent?project=gen-lang-client-0852291573"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-[11px] font-semibold transition-colors"
                  >
                    <span>Open OAuth Consent Screen in Google Cloud</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </li>
              <li>Scroll down to the <strong>"Test users"</strong> section.</li>
              <li>Click the <strong>"+ ADD USERS"</strong> button.</li>
              <li>Type <strong className="font-mono text-blue-950">{TARGET_GOOGLE_EMAIL}</strong> and click <strong>SAVE</strong>.</li>
            </ol>
            <div className="mt-3 p-2.5 bg-emerald-50 rounded border border-emerald-200 text-emerald-900 text-[11px]">
              <strong>💡 Zero-Verification Alternative:</strong> You can also use <strong>Method 3 (Apps Script Web App)</strong> below. Deploying a Google Apps Script in your sheet connects directly via Web App URL and completely bypasses Google OAuth verification!
            </div>
          </div>
        </div>
      )}

      {/* Connection Guide Dropdown */}
      {showInstructions && (
        <div className="bg-blue-50/60 border-b border-blue-100 p-5 text-xs text-gray-700 space-y-3">
          <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-blue-700" />
            3 Easy Ways to Link Your Google Sheet with {TARGET_GOOGLE_EMAIL}:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-2xs">
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] mb-1.5">
                Method 1 (Recommended)
              </span>
              <p className="font-semibold text-gray-900 mb-1">One-Click Sheet Creation</p>
              <p className="text-gray-500 text-[11px] leading-relaxed">
                Click <strong>"Link {TARGET_GOOGLE_EMAIL}"</strong> above, then click <strong>"Build & Link Live Google Sheet"</strong>. A spreadsheet with all 6 business sheets will be created directly in your Google Drive.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-2xs">
              <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] mb-1.5">
                Method 2
              </span>
              <p className="font-semibold text-gray-900 mb-1">Link Existing Spreadsheet</p>
              <p className="text-gray-500 text-[11px] leading-relaxed">
                If you already created a Google Sheet under <strong>{TARGET_GOOGLE_EMAIL}</strong>, click <strong>"Link Existing Sheet ID"</strong> below and paste its URL or ID.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-2xs">
              <span className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px] mb-1.5">
                Method 3
              </span>
              <p className="font-semibold text-gray-900 mb-1">24/7 Apps Script Web App</p>
              <p className="text-gray-500 text-[11px] leading-relaxed">
                Deploy <code>google-apps-script.js</code> in Google Sheets under <strong>{TARGET_GOOGLE_EMAIL}</strong> as a Web App, and paste its URL below for continuous background syncing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert Notifications */}
      {actionMessage && (
        <div className={`p-3.5 px-6 flex items-center gap-2 text-xs font-medium ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100' 
            : actionMessage.type === 'info'
            ? 'bg-blue-50 text-blue-800 border-b border-blue-100'
            : 'bg-red-50 text-red-800 border-b border-red-100'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : actionMessage.type === 'info' ? (
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Main Body */}
      <div className="p-6 space-y-6">
        {linkedSheet ? (
          /* Linked Sheet State */
          <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm">{linkedSheet.title}</h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Linked & Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5 truncate max-w-sm">
                    ID: {linkedSheet.spreadsheetId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={linkedSheet.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={handleUnlinkSheet}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Unlink this spreadsheet"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sheets Tabs Structure: All 9 Modules */}
            <div className="bg-white rounded-lg p-3.5 border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Synchronized Station Modules (9 Sheets):</span>
                </p>
                <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                  All 9 Modules Ready
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { name: "Products", label: "Products & Stock", count: (appData?.products || []).length, unit: "items" },
                  { name: "Sales", label: "Sales / POS Orders", count: (appData?.sales || []).length, unit: "orders" },
                  { name: "Invoices", label: "Sales Invoices", count: (appData?.sales || []).length, unit: "invoices" },
                  { name: "Waybills", label: "Waybills & Delivery", count: (appData?.sales || []).length, unit: "waybills" },
                  { name: "Customers", label: "Customer Accounts", count: (appData?.customers || []).length, unit: "accounts" },
                  { name: "CreditLedger", label: "Credit & Debt Ledger", count: (appData?.customers || []).filter((c: any) => c.type === "Wholesale").length, unit: "wholesale" },
                  { name: "Purchases", label: "Purchases & Intake", count: (appData?.purchases || []).length, unit: "records" },
                  { name: "Users", label: "Staff & Users", count: (appData?.users || []).length, unit: "staff" },
                  { name: "Settings", label: "Station Profile", count: 1, unit: "active" },
                ].map((mod) => (
                  <div key={mod.name} className="p-2 bg-slate-50 rounded-md border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-blue-900">{mod.name}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{mod.count} {mod.unit}</span>
                    </div>
                    <span className="text-[10px] text-gray-600 truncate mt-0.5">{mod.label}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100 flex items-center justify-between">
                <span>Last synchronized: <strong>{linkedSheet.lastSync ? new Date(linkedSheet.lastSync).toLocaleString() : 'Pending sync'}</strong></span>
                <span className="text-emerald-700 font-medium">9 / 9 Sheets Configured</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={triggerSyncToSheet}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <ArrowUpToLine className="w-4 h-4" />
                <span>Sync All 9 Modules Now</span>
              </button>

              <button
                onClick={triggerPullFromSheet}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Load Data from Sheet</span>
              </button>

              <button
                onClick={handleBuildNewGoogleSheet}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Rebuild 9-Sheet Database in Drive</span>
              </button>
            </div>
          </div>
        ) : (
          /* Not Linked Yet State */
          <div className="space-y-4">
            <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50/50">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No Google Sheet Linked Yet</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-6">
                Link to <strong>{TARGET_GOOGLE_EMAIL}</strong> to generate your primary cloud database configured with all required oil & gas tables, or connect an existing spreadsheet.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleBuildNewGoogleSheet}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Build & Link Live Google Sheet in Drive</span>
                </button>

                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>Link Existing Sheet ID / URL</span>
                </button>
              </div>
            </div>

            {/* Manual Link Input */}
            {showManualInput && (
              <form onSubmit={handleLinkExistingSheet} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-800">
                  Enter Google Sheet URL or ID (owned by or shared with {TARGET_GOOGLE_EMAIL})
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XR.../edit or Spreadsheet ID"
                    value={manualSheetInput}
                    onChange={(e) => setManualSheetInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {loading ? "Verifying..." : "Connect"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Make sure the sheet is shared or created under your connected Google account: <strong>{TARGET_GOOGLE_EMAIL}</strong>.
                </p>
              </form>
            )}
          </div>
        )}

        {/* Optional 24/7 Apps Script Web App Integration */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-700" />
              <div>
                <h4 className="text-xs font-bold text-gray-800">24/7 Google Apps Script Web App Endpoint</h4>
                <p className="text-[11px] text-gray-500">
                  Optional: Configure Google Apps Script deployed under <strong>{TARGET_GOOGLE_EMAIL}</strong> for backend automated syncing.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWebAppConfig(!showWebAppConfig)}
              className="text-xs text-blue-900 font-semibold hover:underline cursor-pointer"
            >
              {showWebAppConfig ? "Hide" : "Configure"}
            </button>
          </div>

          {showWebAppConfig && (
            <form onSubmit={handleSaveWebAppUrl} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isSavingWebApp}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingWebApp ? "Saving..." : "Save URL"}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                To generate this URL: Open your Google Sheet in <strong>{TARGET_GOOGLE_EMAIL}</strong> &gt; Extensions &gt; Apps Script &gt; Paste <code>google-apps-script.js</code> &gt; Deploy as Web App.
              </p>
            </form>
          )}
        </div>

        {/* Architecture & Verification Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
            <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5 mb-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              Pure Google Sheets Storage
            </h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              No Firebase Firestore, MySQL, or MongoDB database is used. All business records reside exclusively in your spreadsheet.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
            <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5 mb-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              9 Pre-Structured Modules
            </h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Automatically maintains <strong>Products</strong>, <strong>Sales</strong>, <strong>Invoices</strong>, <strong>Waybills</strong>, <strong>Customers</strong>, <strong>Credit Ledger</strong>, <strong>Purchases</strong>, <strong>Users</strong>, and <strong>Settings</strong> with frozen headers.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
            <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5 mb-1.5">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              Two-Way Interoperability
            </h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              You can view and edit records directly in Google Drive on your phone or laptop, and pull changes right back into the POS application.
            </p>
          </div>
        </div>
      </div>

      {/* CONFIRMATION DIALOG (Mandatory for Workspace mutations) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmModal.action;
                  setConfirmModal(null);
                  setLoading(true);
                  try {
                    await action();
                  } catch (e: any) {
                    if (e instanceof GoogleAuthCancelledError || e?.isCancelled || e?.code === "auth/popup-closed-by-user") {
                      notify("info", "Operation cancelled: Google sign-in popup was closed.");
                    } else {
                      notify("error", e.message || "Operation failed.");
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="px-5 py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold hover:bg-emerald-800 transition-colors shadow-xs"
              >
                {loading ? "Processing..." : "Confirm & Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
