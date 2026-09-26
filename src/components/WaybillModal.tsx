import React from 'react';
import { X, Printer, Download, CheckCircle2, Building2, User, FileText } from 'lucide-react';
import { Waybill } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

interface WaybillModalProps {
  waybill: Waybill | null;
  onClose: () => void;
}

export default function WaybillModal({ waybill, onClose }: WaybillModalProps) {
  if (!waybill) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-blue-950 text-white print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Waybill Details: {waybill.waybillNumber}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-900 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Waybill</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-blue-900 rounded-full transition-colors text-blue-200 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 overflow-y-auto space-y-6 bg-white text-gray-800 text-sm">
          {/* Company & Waybill Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-6">
            <div>
              <h1 className="text-2xl font-black text-blue-950 tracking-tight">OFFICIAL WAYBILL</h1>
              <p className="text-xs text-gray-500 mt-1">Inventory &amp; Dispatch Operations</p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-blue-50 text-blue-900 font-bold px-3 py-1 rounded-lg text-sm border border-blue-100">
                {waybill.waybillNumber}
              </span>
              <p className="text-xs text-gray-500 mt-2">
                Date: <span className="font-semibold text-gray-800">{formatDate(waybill.createdAt)}</span>
              </p>
              <p className="text-xs text-gray-500">
                Status: <span className="font-semibold text-emerald-700 capitalize">{waybill.status || 'Dispatched'}</span>
              </p>
            </div>
          </div>

          {/* Customer & Destination Info */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Customer / Consignee</span>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-800" />
                <span className="font-bold text-gray-900">{waybill.customerName}</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Delivery Destination</span>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-800" />
                <span className="font-semibold text-gray-800">{waybill.destination || 'Standard Store Delivery'}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dispatched Items</h4>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 uppercase tracking-wider font-bold border-b border-gray-200">
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Unit Price (₦)</th>
                  <th className="p-3 text-right">Total (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {waybill.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-900">{item.name || item.productName}</td>
                    <td className="p-3 text-center font-bold text-blue-900">{item.quantity}</td>
                    <td className="p-3 text-right text-gray-600">{formatCurrency(item.price || item.unitPrice || 0)}</td>
                    <td className="p-3 text-right font-bold text-gray-900">{formatCurrency((item.quantity || 0) * (item.price || item.unitPrice || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Additional Notes & Signatures */}
          <div className="pt-6 border-t border-gray-200 grid grid-cols-2 gap-8 text-xs">
            <div>
              <span className="font-bold text-gray-700 block mb-1">Driver / Logistics Notes:</span>
              <p className="text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {waybill.notes || "No special logistics instructions recorded for this transit."}
              </p>
            </div>
            <div className="space-y-6 pt-2">
              <div className="flex justify-between border-b border-gray-300 pb-1">
                <span className="text-gray-400">Dispatcher Signature:</span>
                <span className="font-semibold text-gray-800">___________________</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-1">
                <span className="text-gray-400">Receiver Signature:</span>
                <span className="font-semibold text-gray-800">___________________</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Document</span>
          </button>
        </div>
      </div>
    </div>
  );
}