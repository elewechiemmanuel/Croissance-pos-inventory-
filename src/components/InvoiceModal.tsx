import React, { useState } from "react";
import { Sale, Settings } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { downloadInvoicePdf, printInvoice, generateInvoiceHtml } from "../lib/invoiceGenerator";
import { openStandalonePrintView } from "../lib/printerService";
import { Printer, Download, X, Check, FileText, ExternalLink } from "lucide-react";

interface InvoiceModalProps {
  sale: Sale;
  settings: Settings;
  onClose: () => void;
}

export default function InvoiceModal({ sale, settings, onClose }: InvoiceModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus("Accessing printer...");
    try {
      const ok = await printInvoice(sale, settings);
      setPrintStatus(ok ? "Sent to printer!" : "Opened print window");
    } catch (e: any) {
      handleOpenInNewTab();
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
        setTimeout(() => setPrintStatus(null), 2500);
      }, 1000);
    }
  };

  const handleOpenInNewTab = () => {
    const html = generateInvoiceHtml(sale, settings);
    openStandalonePrintView(html, `Invoice_${sale.invoiceNumber}`);
    setPrintStatus("Opened in dedicated print tab!");
    setTimeout(() => setPrintStatus(null), 3000);
  };

  const handleDownload = () => {
    downloadInvoicePdf(sale, settings);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-blue-900 text-white border-b border-blue-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Tax & Commercial Invoice</h3>
              <p className="text-xs text-blue-200"># {sale.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-blue-800 rounded-full transition-colors text-blue-200 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500 font-medium">
            Customer: <strong className="text-gray-800">{sale.customerName || "Walk-in Customer"}</strong>
            <span className="mx-2">•</span>
            Date: <span className="text-gray-700">{formatDate(sale.date)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-blue-900 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              {downloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Downloaded PDF!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-blue-700" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>{isPrinting ? "Printing..." : "Print A4"}</span>
            </button>
          </div>
        </div>

        {/* Invoice Preview Sheet */}
        <div className="p-6 overflow-y-auto bg-gray-100 flex-1 flex justify-center">
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 text-gray-800 w-full max-w-2xl font-sans text-xs">
            {/* Top Border Ribbon */}
            <div className="h-1.5 bg-blue-900 -mx-8 -mt-8 mb-6 rounded-t-xl" />

            {/* Header info */}
            <div className="flex justify-between items-start gap-4 pb-6 border-b border-gray-200">
              <div>
                <h1 className="text-xl font-black text-blue-950 tracking-tight uppercase">
                  {settings.businessName || "CROISSANCE OIL & GAS LTD"}
                </h1>
                {settings.rcNumber && (
                  <p className="text-xs font-semibold text-gray-600 mt-0.5">RC: {settings.rcNumber}</p>
                )}
                {settings.stationAddress && (
                  <p className="text-xs text-gray-600 mt-1 max-w-sm">
                    <strong>Station:</strong> {settings.stationAddress}
                  </p>
                )}
                {settings.officeAddress && (
                  <p className="text-xs text-gray-600 max-w-sm">
                    <strong>Head Office:</strong> {settings.officeAddress}
                  </p>
                )}
                {settings.phoneNumbers && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    <strong>Tel:</strong> {settings.phoneNumbers}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-blue-900 tracking-wider">INVOICE</span>
                <p className="font-bold text-sm text-gray-800 mt-1"># {sale.invoiceNumber}</p>
                <div className="mt-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-green-100 text-green-800">
                    {sale.paymentStatus || "PAID"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  <strong>Date:</strong> {formatDate(sale.date)}
                </p>
              </div>
            </div>

            {/* Two Column Bill To & Transaction Info */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-200 text-xs">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Billed To:</p>
                <p className="font-bold text-sm text-gray-900">{sale.customerName || "Walk-in Customer"}</p>
                {sale.customerPhone && <p className="text-gray-600 mt-0.5">Phone: {sale.customerPhone}</p>}
                {sale.customerAddress && <p className="text-gray-600 mt-0.5">Address: {sale.customerAddress}</p>}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payment & Staff:</p>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500">Method:</span>
                  <span className="font-semibold uppercase">{sale.paymentMethod || "Cash"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500">Sales Attendant:</span>
                  <span className="font-medium">{sale.staffName || "Staff"}</span>
                </div>
                {sale.waybillNumber && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-gray-500">Waybill:</span>
                    <span className="font-bold text-blue-800">{sale.waybillNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full my-4 text-left border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 text-center w-10">S/N</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sale.items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-center text-gray-500">{i + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{item.productName}</td>
                    <td className="py-2.5 px-3 text-center text-gray-600">{item.unit || "Unit"}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-gray-900">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals and Bank Info */}
            <div className="grid grid-cols-2 gap-6 pt-2 border-t border-gray-200">
              <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-[11px]">
                <p className="font-bold text-blue-900 text-xs mb-1">Official Bank Payment Details:</p>
                <p className="text-gray-700">Bank: <strong>Zenith Bank PLC / First Bank</strong></p>
                <p className="text-gray-700">Account Name: <strong>{settings.businessName || "Croissance Oil and Gas Ltd"}</strong></p>
                <p className="text-gray-700">Reference: <strong>{sale.invoiceNumber}</strong></p>
                <p className="text-gray-500 text-[10px] mt-2 italic">Goods sold in good condition are not returnable.</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(sale.subtotal || sale.totalAmount)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                {sale.tax !== undefined && sale.tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax:</span>
                    <span className="font-semibold">+{formatCurrency(sale.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t-2 border-blue-900 font-bold text-sm text-blue-950">
                  <span>GRAND TOTAL:</span>
                  <span>{formatCurrency(sale.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-dashed border-gray-300">
              <div className="text-center">
                <div className="border-t border-gray-400 pt-1 text-[10px] text-gray-600 font-medium">
                  Authorized Signatory & Stamp<br />
                  <strong className="text-gray-800">{settings.businessName || "Croissance Oil & Gas Ltd"}</strong>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-1 text-[10px] text-gray-600 font-medium">
                  Customer Acceptance / Signature<br />
                  <span className="text-gray-500">Received in good order and condition</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
            >
              Close
            </button>
            {printStatus && (
              <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {printStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Open standalone invoice page to print on any office or network printer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
              <span>Print Tab</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Invoice</span>
            </button>
            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Send to physical printer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isPrinting ? "Accessing..." : "Print Invoice"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}