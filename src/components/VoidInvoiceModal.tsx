import React, { useState } from "react";
import { Sale } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { apiCall } from "../lib/api";
import { AlertTriangle, Trash2, X, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";

interface VoidInvoiceModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: (deletedInvoiceNumber: string) => void;
}

export default function VoidInvoiceModal({ sale, onClose, onSuccess }: VoidInvoiceModalProps) {
  const [reason, setReason] = useState("");
  const [restoreStock, setRestoreStock] = useState(true);
  const [confirmInvoiceInput, setConfirmInvoiceInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = reason.trim().length >= 5 && confirmInvoiceInput.trim() === sale.invoiceNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await apiCall("deleteSale", {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        reason: reason.trim(),
        restoreStock: restoreStock
      });
      onSuccess(sale.invoiceNumber);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to void invoice. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto border border-red-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-red-800 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Void / Delete Sales Invoice</h3>
              <p className="text-xs text-red-100">Permanent administrative action &amp; audit logged</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 hover:bg-red-800 rounded-lg text-red-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Warning Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Critical Compliance Action
            </p>
            <p>
              Deleting an invoice is permanently registered in the <strong>Audit &amp; Compliance Trail</strong> with your Administrator ID, timestamp, and IP address.
            </p>
          </div>

          {/* Invoice Summary Box */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Invoice Number:</span>
              <span className="font-mono font-bold text-blue-900 text-sm">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Customer:</span>
              <span className="font-semibold text-gray-800">{sale.customerName || "Walk-in Customer"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Date Issued:</span>
              <span className="text-gray-700">{formatDate(sale.date)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Invoice Value:</span>
              <span className="font-bold text-red-700 text-sm">{formatCurrency(sale.totalAmount)}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-500 block mb-1">Products Sold:</span>
              <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                {(sale.items || []).map((item, idx) => (
                  <li key={idx}>
                    {item.productName}: <strong>{item.quantity} {item.unit || "Units"}</strong> @ {formatCurrency(item.unitPrice)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Option: Stock Restoration */}
          <label className="flex items-start gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200 cursor-pointer">
            <input 
              type="checkbox" 
              checked={restoreStock} 
              onChange={e => setRestoreStock(e.target.checked)} 
              className="mt-0.5 rounded text-blue-900 focus:ring-blue-600 w-4 h-4 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-blue-950 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
                Restore Inventory to Tanks / Stock
              </span>
              <p className="text-blue-900/80 mt-0.5">
                Automatically increase product current stock balances by the quantities listed in this invoice.
              </p>
            </div>
          </label>

          {/* Reason for Deletion */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Audit Reason for Voiding / Deletion <span className="text-red-600">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., Customer transaction cancelled; Entered incorrect pump quantity; Duplicate cashier billing..."
              className="w-full p-2.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-600"
            />
            <span className="text-[11px] text-gray-400 mt-0.5 block">
              Minimum 5 characters required. This reason is permanently visible in the Audit Log.
            </span>
          </div>

          {/* Type invoice number to confirm */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Type <span className="font-mono text-red-600 font-bold">{sale.invoiceNumber}</span> to confirm <span className="text-red-600">*</span>
            </label>
            <input
              required
              type="text"
              value={confirmInvoiceInput}
              onChange={e => setConfirmInvoiceInput(e.target.value)}
              placeholder={sale.invoiceNumber}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Voiding Invoice..." : "Permanently Void Invoice"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
