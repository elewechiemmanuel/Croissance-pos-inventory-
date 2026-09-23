import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DataContext } from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import { apiCall } from "../lib/api";
import { 
  UserCog, 
  ShieldCheck, 
  ArrowRight, 
  Printer, 
  Cpu, 
  Radio, 
  CheckCircle, 
  Sparkles,
  Landmark,
  CreditCard,
  Save,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Shield,
  Plus,
  Trash2
} from "lucide-react";
import ExportDataButton from "../components/ExportDataButton";
import GoogleSheetSync from "../components/GoogleSheetSync";
import { executePrint, isWebSerialSupported, printToHardwareSerialPrinter, isWebBluetoothSupported, printToBluetoothPrinter } from "../lib/printerService";

const NIGERIAN_BANKS = [
  "First Bank of Nigeria",
  "Zenith Bank PLC",
  "Guaranty Trust Bank (GTBank)",
  "Access Bank",
  "United Bank for Africa (UBA)",
  "Stanbic IBTC Bank",
  "Fidelity Bank",
  "Ecobank Nigeria",
  "Sterling Bank",
  "Union Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Wema Bank",
  "Polaris Bank",
  "Providus Bank",
  "Keystone Bank",
  "Jaiz Bank",
  "Taj Bank",
  "Lotus Bank",
  "Moniepoint MFB",
  "Kuda Bank",
  "OPay Digital Services"
];

export default function Settings() {
  const dataContext = useContext(DataContext);
  const { settings = {}, users = [], refreshData } = dataContext;
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [printerStatus, setPrinterStatus] = useState<string | null>(null);

  // Bank & Company Profile State
  const [formData, setFormData] = useState({
    businessName: settings.businessName || "Croissance Oil and Gas Ltd",
    rcNumber: settings.rcNumber || "1292088",
    stationAddress: settings.stationAddress || "",
    officeAddress: settings.officeAddress || "",
    phoneNumbers: settings.phoneNumbers || "",
    email: settings.email || "",
    // Bank Details
    bankName: settings.bankName || "First Bank of Nigeria",
    accountNumber: settings.accountNumber || "2034891234",
    accountName: settings.accountName || "Croissance Oil and Gas Ltd",
    bankBranch: settings.bankBranch || "Ajah Branch, Lagos",
    sortCode: settings.sortCode || "011152303",
    taxIdNumber: settings.taxIdNumber || "TIN-1292088-001",
    paymentInstructions: settings.paymentInstructions || "Please use your Invoice / Waybill number as narration/reference and notify sales cashier upon transfer.",
    // Secondary Bank
    secondaryBankName: settings.secondaryBankName || "",
    secondaryAccountNumber: settings.secondaryAccountNumber || "",
    secondaryAccountName: settings.secondaryAccountName || "",
  });

  const [showSecondaryBank, setShowSecondaryBank] = useState(
    Boolean(settings.secondaryBankName || settings.secondaryAccountNumber)
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync state if settings update from backend
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        businessName: settings.businessName || prev.businessName,
        rcNumber: settings.rcNumber || prev.rcNumber,
        stationAddress: settings.stationAddress || prev.stationAddress,
        officeAddress: settings.officeAddress || prev.officeAddress,
        phoneNumbers: settings.phoneNumbers || prev.phoneNumbers,
        email: settings.email || prev.email,
        bankName: settings.bankName || prev.bankName,
        accountNumber: settings.accountNumber || prev.accountNumber,
        accountName: settings.accountName || prev.accountName,
        bankBranch: settings.bankBranch || prev.bankBranch,
        sortCode: settings.sortCode || prev.sortCode,
        taxIdNumber: settings.taxIdNumber || prev.taxIdNumber,
        paymentInstructions: settings.paymentInstructions || prev.paymentInstructions,
        secondaryBankName: settings.secondaryBankName || prev.secondaryBankName,
        secondaryAccountNumber: settings.secondaryAccountNumber || prev.secondaryAccountNumber,
        secondaryAccountName: settings.secondaryAccountName || prev.secondaryAccountName,
      }));
      if (settings.secondaryBankName || settings.secondaryAccountNumber) {
        setShowSecondaryBank(true);
      }
    }
  }, [settings]);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveBankAndProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict block if user is not an administrator
    if (!isAdmin) {
      setSaveError("Administrative authorization required to update bank and business profile.");
      return;
    }

    if (!formData.bankName.trim() || !formData.accountNumber.trim() || !formData.accountName.trim()) {
      setSaveError("Bank Name, Account Number, and Account Name are required.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payloadToSave = {
        ...formData,
        secondaryBankName: showSecondaryBank ? formData.secondaryBankName : "",
        secondaryAccountNumber: showSecondaryBank ? formData.secondaryAccountNumber : "",
        secondaryAccountName: showSecondaryBank ? formData.secondaryAccountName : "",
      };

      await apiCall("updateSettings", payloadToSave);
      if (refreshData) {
        await refreshData();
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save bank details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const activeCashiers = users.filter((u: any) => u.role === "user" && (u.status || "Active") === "Active").length;
  const activeAdmins = users.filter((u: any) => u.role === "admin" && (u.status || "Active") === "Active").length;

  const handleTestInstalledPrinter = async () => {
    setPrinterStatus("Launching device printer dialog...");
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Printer Diagnostic Test - Croissance POS</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              padding: 10px;
              width: 76mm;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .double-divider { border-bottom: 2px solid #000; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h3 style="margin: 0; font-size: 14px;">CROISSANCE OIL & GAS LTD</h3>
            <p style="margin: 2px 0; font-size: 10px;">${settings.stationAddress || "Plot 12, Commercial Area, Port Harcourt"}</p>
            <div class="double-divider"></div>
            <h4 style="margin: 4px 0;">DEVICE PRINTER TEST</h4>
            <p style="margin: 2px 0; font-size: 10px;">Date: ${new Date().toLocaleString()}</p>
            <div class="divider"></div>
          </div>
          <p>This test confirms that your device's installed printer is communicating properly with Croissance POS.</p>
          <div class="divider"></div>
          <table style="width: 100%; font-size: 11px;">
            <tr><td>Status:</td><td style="text-align: right; font-weight: bold;">CONNECTED</td></tr>
            <tr><td>Driver:</td><td style="text-align: right;">System Spooler</td></tr>
            <tr><td>Paper:</td><td style="text-align: right;">80mm Thermal</td></tr>
          </table>
          <div class="double-divider"></div>
          <div class="text-center" style="font-size: 10px;">
            <p style="font-weight: bold;">*** TEST SUCCESSFUL ***</p>
            <p>Printer ready for receipts and invoices.</p>
          </div>
        </body>
      </html>
    `;

    try {
      const res = await executePrint(sampleHtml, { title: "Printer Test - Croissance POS", paperSize: "thermal80" });
      setPrinterStatus(res.message);
    } catch (e: any) {
      setPrinterStatus("Failed to access printer. Please check popup permissions.");
    } finally {
      setTimeout(() => setPrinterStatus(null), 4500);
    }
  };

  const handleTestUsbSerial = async () => {
    setPrinterStatus("Connecting to USB/COM thermal printer...");
    const raw = `
================================
   CROISSANCE POS HARDWARE
================================
PORT: USB / SERIAL COM
BAUD: 9600 BPS
TEST: ESC/POS DIRECT CUT
STATUS: HARDWARE OK
================================
    PRINTER HARDWARE VERIFIED
================================
    `;
    const ok = await printToHardwareSerialPrinter(raw);
    if (ok) {
      setPrinterStatus("Direct USB test printed successfully!");
      setTimeout(() => setPrinterStatus(null), 3500);
    } else {
      setPrinterStatus(null);
    }
  };

  const handleTestBluetooth = async () => {
    setPrinterStatus("Connecting to Bluetooth POS printer...");
    const raw = `
================================
   CROISSANCE POS BLUETOOTH
================================
TEST: WIRELESS THERMAL SLIP
STATUS: BLUETOOTH OK
DATE: ${new Date().toLocaleTimeString()}
================================
    `;
    const ok = await printToBluetoothPrinter(raw);
    if (ok) {
      setPrinterStatus("Direct Bluetooth test printed successfully!");
      setTimeout(() => setPrinterStatus(null), 3500);
    } else {
      setPrinterStatus(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-blue-900">System Settings</h1>
        {isAdmin && <ExportDataButton />}
      </div>

      <GoogleSheetSync 
        appData={dataContext} 
        onRefreshLocalData={dataContext.refreshData} 
      />

      {/* Device & Hardware Printer Station */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-800" />
              Device Printer &amp; Hardware Diagnostics
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Connect and test physical receipt and document printers installed on this computer or terminal.
            </p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Driver Ready</span>
          </span>
        </div>

        {printerStatus && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-900 animate-in fade-in flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{printerStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-blue-950">
                <Printer className="w-4 h-4 text-blue-700" />
                <span>Installed Device Printer</span>
              </div>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Uses your operating system's default printer (Epson, HP, Canon, POS-80, Xprinter, or network printer).
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestInstalledPrinter}
              className="mt-4 w-full py-2 px-3 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Installed Printer</span>
            </button>
          </div>

          <div className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-blue-950">
                <Cpu className="w-4 h-4 text-emerald-700" />
                <span>USB / Serial Thermal</span>
              </div>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Direct raw ESC/POS commands over USB or COM port. {isWebSerialSupported() ? "Available on this browser." : "Requires Chrome or Edge."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestUsbSerial}
              disabled={!isWebSerialSupported()}
              className="mt-4 w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Test USB Hardware</span>
            </button>
          </div>

          <div className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-blue-950">
                <Radio className="w-4 h-4 text-indigo-700" />
                <span>Bluetooth POS Printer</span>
              </div>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Wireless thermal receipt slip printers used for portable fuel pump attendants and mobile POS.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestBluetooth}
              disabled={!isWebBluetoothSupported()}
              className="mt-4 w-full py-2 px-3 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Test Bluetooth POS</span>
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>How to set your default printer:</strong> In Windows (Settings &gt; Bluetooth &amp; Devices &gt; Printers) or macOS (System Settings &gt; Printers), set your POS Receipt Printer or Office Printer as "Default". Croissance POS will automatically send all print jobs to that printer.
          </div>
        </div>
      </div>

      {/* Staff & User Accounts Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-blue-800" />
              Staff Accounts & Access Roles
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Create and manage login access for fuel attendants, cashiers, and managers.
            </p>
          </div>
          <Link
            to="/users"
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            <span>Manage Users</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
            <span className="text-xs text-blue-800 font-semibold block">Active Cashiers / Attendants</span>
            <span className="text-xl font-bold text-blue-950 mt-1 block">{activeCashiers} Staff</span>
          </div>
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100">
            <span className="text-xs text-amber-800 font-semibold block">System Administrators</span>
            <span className="text-xl font-bold text-amber-950 mt-1 block">{activeAdmins} Admins</span>
          </div>
        </div>
      </div>

      {/* Company Bank Details & Settlement Accounts (Admin Managed) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-900 rounded-lg">
                <Landmark className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                Company Bank Details & Settlement Accounts
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure the official receiving bank accounts displayed on printed receipts, commercial invoices, and waybills.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Authorized (Editable)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <Shield className="w-3.5 h-3.5" />
                Read-Only (Admin Access Required)
              </span>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Company bank settlement details and business profile updated successfully!</span>
          </div>
        )}

        {saveError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSaveBankAndProfile} className="mt-6 space-y-6">
          {/* Bank Account Details Grid */}
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-900" />
                Primary Settlement Account
              </span>
              <span className="text-xs text-slate-500">Appears by default on all invoices</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="nigerian-banks-list"
                  value={formData.bankName}
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                  disabled={!isAdmin || saving} // <-- Locked to Admin only
                  placeholder="e.g. First Bank of Nigeria"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
                <datalist id="nigerian-banks-list">
                  {NIGERIAN_BANKS.map(bank => (
                    <option key={bank} value={bank} />
                  ))}
                </datalist>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Account Number (NUBAN) <span className="text-red-500">*</span>
                  </label>
                  {formData.accountNumber && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(formData.accountNumber, "accountNumber")}
                      className="text-[11px] text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedField === "accountNumber" ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.accountNumber}
                  onChange={e => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, "") })}
                  disabled={!isAdmin || saving} // <-- Locked to Admin only
                  placeholder="10-digit NUBAN"
                  className="w-full p-2.5 text-sm font-mono tracking-wider border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  {formData.accountNumber.length}/10 digits
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                  disabled={!isAdmin || saving} // <-- Locked to Admin only
                  placeholder="e.g. Croissance Oil and Gas Ltd"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Branch</label>
                <input
                  type="text"
                  value={formData.bankBranch}
                  onChange={e => setFormData({ ...formData, bankBranch: e.target.value })}
                  disabled={!isAdmin || saving} // <-- Locked to Admin only
                  placeholder="e.g. Ajah / Lekki Branch, Lagos"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sort Code / CBN Code</label>
                <input
                  type="text"
                  value={formData.sortCode}
                  onChange={e => setFormData({ ...formData, sortCode: e.target.value })}
                  disabled={!isAdmin || saving} // <-- Locked to Admin only
                  placeholder="e.g. 011152303"
                  className="w-full p-2.5 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tax ID Number (TIN)</label>
                <input
                  type="text"
                  value={formData.taxIdNumber}
                  onChange={e => setFormData({ ...formData, taxIdNumber: e.target.value })}
                  disabled={!isAdmin || saving} // <-- Locked to Admin only
                  placeholder="e.g. TIN-1292088-001"
                  className="w-full p-2.5 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Payment Instructions &amp; Narration Note
                </label>
                <input
                  type="text"
                  value={formData.paymentInstructions}
                  onChange={e => setFormData({ ...formData, paymentInstructions: e.target.value })}
                  disabled={!isAdmin || saving} // <-- Locked to Admin only
                  placeholder="e.g. Please use Invoice / Waybill number as transfer narration and notify cashier."
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  This text will print directly below the bank account box on commercial invoices.
                </span>
              </div>
          </div>

          {/* Secondary Bank Account Option */}
          <div className="pt-2 border-t border-slate-200/80">
            {!showSecondaryBank ? (
              isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSecondaryBank(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-900 hover:text-blue-700 py-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Secondary / Alternative Bank Account (Optional)
                </button>
              )
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    Alternative Bank Account (Optional)
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSecondaryBank(false);
                        setFormData({
                          ...formData,
                          secondaryBankName: "",
                          secondaryAccountNumber: "",
                          secondaryAccountName: ""
                        });
                      }}
                      className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove Alternative Account
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      list="nigerian-banks-list"
                      value={formData.secondaryBankName}
                      onChange={e => setFormData({ ...formData, secondaryBankName: e.target.value })}
                      disabled={!isAdmin || saving}
                      placeholder="e.g. Zenith Bank PLC"
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={formData.secondaryAccountNumber}
                      onChange={e => setFormData({ ...formData, secondaryAccountNumber: e.target.value.replace(/\D/g, "") })}
                      disabled={!isAdmin || saving}
                      placeholder="10-digit NUBAN"
                      className="w-full p-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={formData.secondaryAccountName}
                      onChange={e => setFormData({ ...formData, secondaryAccountName: e.target.value })}
                      disabled={!isAdmin || saving}
                      placeholder="e.g. Croissance Oil and Gas Ltd"
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button strictly wrapped for Admin */}
        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Changes..." : "Save Bank & Profile Details"}
            </button>
          </div>
        )}
      </form>
    </div>
  </div>
  );
}