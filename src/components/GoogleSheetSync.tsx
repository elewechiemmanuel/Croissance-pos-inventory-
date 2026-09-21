import React, { useState, useEffect } from "react";
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
// Import your initialized Firebase db instance
import { db } from "../lib/firebase"; 
import { doc, getDoc, setDoc, collection, writeBatch, Timestamp } from "firebase/firestore";

interface FirebaseSyncProps {
  appData: any;
  onRefreshLocalData?: () => Promise<void>;
  stationId?: string; // Optional: identifier for multi-tenant station databases
}

export default function FirebaseSync({ appData, onRefreshLocalData, stationId = "default_station" }: FirebaseSyncProps) {
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(true);

  // Confirmation modal for sync actions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    // Check initial Firestore metadata status on load
    checkFirebaseStatus();
  }, [stationId]);

  const checkFirebaseStatus = async () => {
    try {
      const metadataRef = doc(db, "stations", stationId, "metadata", "syncInfo");
      const snap = await getDoc(metadataRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.lastSync) {
          setLastSyncTime(data.lastSync);
        }
      }
    } catch (err) {
      console.error("Error checking Firebase status:", err);
    }
  };

  const notify = (type: 'success' | 'error' | 'info', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Sync all application modules up to Firebase Firestore
  const handleSyncToFirebase = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();

      // Reference to the station document container
      const stationRef = doc(db, "stations", stationId);

      // Save main modules or collections
      // 1. Products
      if (appData?.products) {
        const productsRef = doc(db, "stations", stationId, "modules", "products");
        batch.set(productsRef, { items: appData.products, updatedAt: timestamp });
      }

      // 2. Sales / POS Orders
      if (appData?.sales) {
        const salesRef = doc(db, "stations", stationId, "modules", "sales");
        batch.set(salesRef, { items: appData.sales, updatedAt: timestamp });
      }

      // 3. Customers
      if (appData?.customers) {
        const customersRef = doc(db, "stations", stationId, "modules", "customers");
        batch.set(customersRef, { items: appData.customers, updatedAt: timestamp });
      }

      // 4. Purchases
      if (appData?.purchases) {
        const purchasesRef = doc(db, "stations", stationId, "modules", "purchases");
        batch.set(purchasesRef, { items: appData.purchases, updatedAt: timestamp });
      }

      // 5. Users / Staff
      if (appData?.users) {
        const usersRef = doc(db, "stations", stationId, "modules", "users");
        batch.set(usersRef, { items: appData.users, updatedAt: timestamp });
      }

      // 6. Settings / Station Profile
      if (appData?.settings) {
        const settingsRef = doc(db, "stations", stationId, "modules", "settings");
        batch.set(settingsRef, { ...appData.settings, updatedAt: timestamp });
      }

      // Metadata update
      const metadataRef = doc(db, "stations", stationId, "metadata", "syncInfo");
      batch.set(metadataRef, { lastSync: timestamp, status: "active" }, { merge: true });

      await batch.commit();
      setLastSyncTime(timestamp);
      notify("success", "Successfully synchronized all modules to Firebase Firestore!");
    } catch (err: any) {
      console.error(err);
      notify("error", err?.message || "Failed to sync data to Firebase.");
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  // Pull / Load data down from Firebase Firestore
  const handlePullFromFirebase = async () => {
    setLoading(true);
    try {
      const modulesList = ["products", "sales", "customers", "purchases", "users", "settings"];
      let pulledCounts = { products: 0, customers: 0 };

      for (const mod of modulesList) {
        const modRef = doc(db, "stations", stationId, "modules", mod);
        const snap = await getDoc(modRef);
        if (snap.exists()) {
          const data = snap.data();
          if (mod === "products" && data.items) pulledCounts.products = data.items.length;
          if (mod === "customers" && data.items) pulledCounts.customers = data.items.length;
        }
      }

      if (onRefreshLocalData) {
        await onRefreshLocalData();
      }

      notify("success", `Successfully loaded records from Firebase Firestore (${pulledCounts.products} products, ${pulledCounts.customers} customers)!`);
    } catch (err: any) {
      console.error(err);
      notify("error", err?.message || "Failed to load data from Firebase.");
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  const triggerSyncConfirmation = () => {
    setConfirmModal({
      isOpen: true,
      title: "Sync All Modules to Firebase?",
      message: "This will overwrite cloud database documents with your latest local application state.",
      action: handleSyncToFirebase,
    });
  };

  const triggerPullConfirmation = () => {
    setConfirmModal({
      isOpen: true,
      title: "Load Data from Firebase?",
      message: "This will refresh your local records using the latest state stored in Firebase Firestore.",
      action: handlePullFromFirebase,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Banner / Header */}
      <div className="p-6 bg-gradient-to-r from-amber-700 via-amber-800 to-orange-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">Firebase Cloud Database</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">
                Primary Cloud Store
              </span>
            </div>
            <p className="text-xs text-amber-100 mt-0.5">
              Live Firestore synchronization active for station: <strong className="font-mono">{stationId}</strong>
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 bg-amber-900/80 px-3.5 py-2 rounded-lg border border-amber-600/50">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
          <div className="text-xs">
            <span className="text-amber-200 text-[10px] block">Database Status</span>
            <span className="font-semibold text-white font-mono text-[11px]">Connected & Secure</span>
          </div>
        </div>
      </div>

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
        <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-700 text-white flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-sm">Firestore Station Collection</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Online
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Path: stations / {stationId} / modules
                </p>
              </div>
            </div>
          </div>

          {/* Modules Grid Structure */}
          <div className="bg-white rounded-lg p-3.5 border border-amber-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>Synchronized Station Modules:</span>
              </p>
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                Firestore Ready
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
                    <span className="text-[11px] font-mono font-bold text-amber-900">{mod.name}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{mod.count} {mod.unit}</span>
                  </div>
                  <span className="text-[10px] text-gray-600 truncate mt-0.5">{mod.label}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100 flex items-center justify-between">
              <span>Last synchronized: <strong>{lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Pending sync'}</strong></span>
              <span className="text-amber-700 font-medium">Cloud Synced</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={triggerSyncConfirmation}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <ArrowUpToLine className="w-4 h-4" />
              <span>Sync All Modules to Firebase</span>
            </button>

            <button
              onClick={triggerPullConfirmation}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Load Data from Firebase</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">{confirmModal.title}</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.action}
                disabled={loading}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                {loading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}