import React, { useRef } from "react";
import { Product } from "../types";
import { formatCurrency } from "../lib/utils";
import { Printer, Download, X, CheckCircle, Store, Phone, MapPin, Mail, Calendar, User, FileText } from "lucide-react";

export interface ReceiptItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
  salesType?: string;
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: string;
  notes?: string;
}

interface ReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  businessInfo?: {
    name: string;
    tagline?: string;
    address: string;
    phone: string;
    email: string;
    taxId?: string;
  };
}

export default function Receipt({
  isOpen,
  onClose,
  receipt,
  businessInfo = {
    name: "CROISSANCE OIL & GAS LTD",
    tagline: "Premium Petroleum Products & Energy Solutions",
    address: "Plot 12, Energy City Expressway, Lagos, Nigeria",
    phone: "+234 803 000 1122",
    email: "sales@croissanceoil.com",
    taxId: "TIN-98765432-0001"
  }
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Fallback or trigger print dialog configured for save-to-pdf
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        
        {/* Modal Action Header (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Transaction Receipt</h3>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {receipt.receiptNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 print:bg-white print:p-0">
          <div 
            ref={receiptRef}
            className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 max-w-md mx-auto print:shadow-none print:border-none print:w-full print:max-w-none font-sans text-gray-800"
          >
            {/* Business Header */}
            <div className="text-center pb-4 border-b border-dashed border-gray-300">
              <div className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Store className="w-6 h-6 text-amber-400" />
              </div>
              <h1 className="text-base font-extrabold tracking-wide text-blue-950 uppercase">
                {businessInfo.name}
              </h1>
              {businessInfo.tagline && (
                <p className="text-[11px] text-gray-500 mt-0.5">{businessInfo.tagline}</p>
              )}
              <div className="text-[11px] text-gray-600 space-y-0.5 mt-2">
                <p className="flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                  <span>{businessInfo.address}</span>
                </p>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                    <span>{businessInfo.phone}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                    <span>{businessInfo.email}</span>
                  </span>
                </div>
                {businessInfo.taxId && (
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">TIN: {businessInfo.taxId}</p>
                )}
              </div>
            </div>

            {/* Receipt Meta Information */}
            <div className="py-3 border-b border-dashed border-gray-300 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Receipt No</span>
                <span className="font-mono font-bold text-gray-900">{receipt.receiptNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Date & Time</span>
                <span className="font-medium text-gray-800">{receipt.date}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Cashier</span>
                <span className="font-medium text-gray-800">{receipt.cashierName || "Authorized Cashier"}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Customer</span>
                <span className="font-medium text-gray-800">{receipt.customerName || "Walk-in Customer"}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-gray-300">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-200 pb-1 text-[10px] uppercase tracking-wider">
                    <th className="pb-1.5 font-semibold">Item Description</th>
                    <th className="pb-1.5 text-center font-semibold">Qty</th>
                    <th className="pb-1.5 text-right font-semibold">Price</th>
                    <th className="pb-1.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {receipt.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-2 pr-2">
                        <p className="font-bold text-gray-900">{item.productName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                          {item.salesType && (
                            <span className="bg-gray-100 px-1 rounded text-gray-600 font-medium">
                              {item.salesType}
                            </span>
                          )}
                          {item.unit && <span>Unit: {item.unit}</span>}
                        </div>
                      </td>
                      <td className="py-2 text-center font-mono text-gray-700 whitespace-nowrap">
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-mono text-gray-600 whitespace-nowrap">
                        ₦{item.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        ₦{item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Calculation */}
            <div className="py-3 border-b border-dashed border-gray-300 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono font-medium">₦{receipt.subtotal.toLocaleString()}</span>
              </div>
              {receipt.discount && receipt.discount > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount Applied</span>
                  <span className="font-mono font-medium">-₦{receipt.discount.toLocaleString()}</span>
                </div>
              ) : null}
              {receipt.tax && receipt.tax > 0 ? (
                <div className="flex justify-between text-gray-600">
                  <span>Consumption Tax / VAT</span>
                  <span className="font-mono font-medium">₦{receipt.tax.toLocaleString()}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-bold text-blue-950 pt-1 border-t border-gray-200">
                <span>Total Amount</span>
                <span className="font-mono text-base">₦{receipt.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-3 border-b border-dashed border-gray-300 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-bold uppercase text-gray-900 bg-blue-50 px-2 py-0.5 rounded">
                  {receipt.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Tendered</span>
                <span className="font-mono font-semibold text-gray-800">₦{receipt.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Change Given</span>
                <span className="font-mono font-semibold text-emerald-700">₦{receipt.change.toLocaleString()}</span>
              </div>
            </div>

            {/* Notes / Footer Message */}
            <div className="pt-4 text-center space-y-2">
              {receipt.notes && (
                <p className="text-[11px] text-gray-600 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                  "{receipt.notes}"
                </p>
              )}
              <p className="text-xs font-bold text-blue-950">
                Thank you for your patronage!
              </p>
              <p className="text-[10px] text-gray-400">
                Please drive safely • Products verified & tested for quality assurance.
              </p>
              <div className="pt-2">
                <span className="text-[9px] font-mono text-gray-300 uppercase tracking-widest">
                  Powered by Croissance ERP Systems
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer (Hidden during print) */}
        <div className="p-4 bg-gray-100 border-t border-gray-200 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Close Window
          </button>
          
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
}