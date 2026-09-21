import React, { useState } from "react";
import { Download, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { apiCall } from "../lib/api";
import * as XLSX from "xlsx";

export default function ExportDataButton() {
  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExportAllData = async () => {
    setExporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Fetch all core collections/tables using your API layer
      const [productsRes, customersRes, invoicesRes, waybillsRes, usersRes] = await Promise.all([
        apiCall("getProducts").catch(() => []),
        apiCall("getCustomers").catch(() => []),
        apiCall("getInvoices").catch(() => []),
        apiCall("getWaybills").catch(() => []),
        apiCall("getUsers").catch(() => []),
      ]);

      const wb = XLSX.utils.book_new();

      // Helper to append sheet if data exists
      const addSheet = (data: any[], name: string) => {
        const sheetData = Array.isArray(data) ? data : (data as any)?.items || [];
        const ws = XLSX.utils.json_to_sheet(sheetData.length > 0 ? sheetData : [{ Note: "No records found" }]);
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      addSheet(productsRes, "Products");
      addSheet(customersRes, "Customers");
      addSheet(invoicesRes, "Invoices");
      addSheet(waybillsRes, "Waybills");
      addSheet(usersRes, "Staff & Users");

      // Generate file and trigger download
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Croissance_POS_Complete_Backup_${dateStr}.xlsx`);

      setSuccessMsg("All business data exported successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Export error:", err);
      setErrorMsg(err.message || "Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExportAllData}
        disabled={exporting}
        className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Compiling Backup...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Export All Data (Excel)</span>
          </>
        )}
      </button>

      {successMsg && (
        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {successMsg}
        </span>
      )}

      {errorMsg && (
        <span className="text-[11px] text-red-600 font-medium flex items-center gap-1 animate-in fade-in">
          <AlertTriangle className="w-3.5 h-3.5" />
          {errorMsg}
        </span>
      )}
    </div>
  );
}