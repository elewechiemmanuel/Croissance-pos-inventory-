import React, { useState } from "react";
import { Settings, Sale } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { printReceipt, downloadReceiptPdf, generateReceiptHtml, generateRawEscPosReceipt } from "../lib/receiptPrinter";
import { downloadInvoicePdf } from "../lib/invoiceGenerator";
import { downloadWaybillPdf } from "../lib/waybillGenerator";
import { 
  openStandalonePrintView, 
  isWebSerialSupported, 
  printToHardwareSerialPrinter,
  isWebBluetoothSupported,
  printToBluetoothPrinter,
  isSandboxedIframe
} from "../lib/printerService";
import InvoiceModal from "./InvoiceModal";
import WaybillModal from "./WaybillModal";
import { Printer, X, Download, FileText, Check, Truck, ExternalLink, Cpu, Radio, Sparkles } from "lucide-react";

interface ReceiptProps {
  sale: Sale;
  settings: Settings;
  onClose: () => void;
}

export default function Receipt({ sale, settings, onClose }: ReceiptProps) {
  const [paperSize, setPaperSize] = useState<"thermal80" | "thermal58" | "standard">("thermal80");
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showWaybillModal, setShowWaybillModal] = useState(false);

  const isInIframe = isSandboxedIframe();

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus("Accessing device printer...");
    try {
      const ok = await printReceipt(sale, settings, paperSize);
      if (ok) {
        setPrintStatus("Printer window opened! Your device's installed printer dialog is ready.");
      } else {
        setPrintStatus("Opening direct print window...");
        handleOpenInNewTab();
      }
    } catch (e: any) {
      setPrintStatus("Opening print tab...");
      handleOpenInNewTab();
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
        setTimeout(() => setPrintStatus(null), 4000);
      }, 1200);
    }
  };

  const handleOpenInNewTab = () => {
    const html = generateReceiptHtml(sale, settings, paperSize);
    openStandalonePrintView(html, `Receipt_${sale.invoiceNumber}`);
    setPrintStatus("Opened printable receipt with auto-printer access!");
    setTimeout(() => setPrintStatus(null), 3500);
  };

  const handleSerialPrint = async () => {
    setPrintStatus("Connecting to USB thermal printer...");
    const raw = generateRawEscPosReceipt(sale, settings);
    const success = await printToHardwareSerialPrinter(raw);
    if (success) {
      setPrintStatus("Printed directly to USB POS hardware!");
      setTimeout(() => setPrintStatus(null), 3500);
    } else {
      setPrintStatus(null);
    }
  };

  const handleBluetoothPrint = async () => {
    setPrintStatus("Connecting to Bluetooth POS printer...");
    const raw = generateRawEscPosReceipt(sale, settings);
    const success = await printToBluetoothPrinter(raw);
    if (success) {
      setPrintStatus("Printed to wireless Bluetooth POS printer!");
      setTimeout(() => setPrintStatus(null), 3500);
    } else {
      setPrintStatus(null);
    }
  };

  const handleDownload = () => {
    downloadReceiptPdf(sale, settings);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-100 bg-blue-900 text-white">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm tracking-wide">Sales Receipt / Slip</h3>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-blue-800 rounded-full transition-colors text-blue-200 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Paper & Print Mode Selector Bar */}
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-gray-600">
              <span>Printer:</span>
              <div className="flex bg-gray-200/80 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPaperSize("thermal80")}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    paperSize === "thermal80" ? "bg-white font-bold text-blue-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize("thermal58")}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    paperSize === "thermal58" ? "bg-white font-bold text-blue-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize("standard")}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    paperSize === "standard" ? "bg-white font-bold text-blue-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Standard
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1 text-blue-800 hover:text-blue-900 font-semibold cursor-pointer py-1 px-2 rounded hover:bg-blue-50 transition-colors"
                title="Download PDF Receipt Copy"
              >
                {downloaded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Document Navigation Strip */}
          <div className="px-5 py-2 bg-blue-50/50 border-b border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Other Documents:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="text-amber-800 bg-amber-100 hover:bg-amber-200 font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <FileText className="w-3 h-3 text-amber-700" />
                <span>Invoice (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWaybillModal(true)}
                className="text-emerald-800 bg-emerald-100 hover:bg-emerald-200 font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Truck className="w-3 h-3 text-emerald-700" />
                <span>Waybill</span>
              </button>
            </div>
          </div>

          {/* Printable Preview Area */}
          <div className="p-6 overflow-y-auto bg-gray-50 flex-1 flex justify-center">
            <div 
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 font-mono text-xs text-black w-full"
              style={{ maxWidth: paperSize === "thermal58" ? "280px" : paperSize === "thermal80" ? "340px" : "100%" }}
            >
              {/* Business Header */}
              <div className="text-center mb-4 space-y-1">
                <h2 className="font-bold text-base uppercase tracking-wider text-gray-900">
                  {settings.businessName || "CROISSANCE OIL & GAS LTD"}
                </h2>
                {settings.rcNumber && (
                  <p className="text-[11px] text-gray-600">RC: {settings.rcNumber}</p>
                )}
                {settings.stationAddress && (
                  <p className="text-[11px] text-gray-600 whitespace-pre-line leading-tight">
                    {settings.stationAddress}
                  </p>
                )}
                {settings.phoneNumbers && (
                  <p className="text-[11px] text-gray-600">Tel: {settings.phoneNumbers}</p>
                )}
              </div>

              <div className="border-t border-b border-dashed border-gray-400 py-2.5 my-3 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans uppercase">Receipt #:</span>
                  <span className="font-bold">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans uppercase">Date:</span>
                  <span>{formatDate(sale.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans uppercase">Cashier:</span>
                  <span>{sale.staffName || "Attendant"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans uppercase">Customer:</span>
                  <span>{sale.customerName || "Walk-in Customer"}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full my-3 text-[11px]">
                <thead>
                  <tr className="border-b border-dashed border-gray-400 font-sans">
                    <th className="text-left py-1 font-bold">ITEM</th>
                    <th className="text-center py-1 font-bold">QTY</th>
                    <th className="text-right py-1 font-bold">PRICE</th>
                    <th className="text-right py-1 font-bold">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 pr-1 font-bold">{item.productName}</td>
                      <td className="text-center py-1.5">{item.quantity}</td>
                      <td className="text-right py-1.5">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right py-1.5 font-bold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-dashed border-gray-400 pt-2.5 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatCurrency(sale.subtotal || sale.totalAmount)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-double border-gray-400 mt-1">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(sale.totalAmount)}</span>
                </div>
                <div className="flex justify-between pt-1 text-gray-700">
                  <span className="text-gray-500 font-sans uppercase text-[10px]">Payment:</span>
                  <span className="font-bold uppercase">{sale.paymentMethod || "CASH"} ({sale.paymentStatus || "PAID"})</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-5 pt-3 border-t border-dashed border-gray-400 space-y-1 text-[10px] text-gray-600">
                <p className="font-bold uppercase text-gray-900">Thank you for your patronage!</p>
                <p>Goods sold in good condition are not returnable</p>
                <p className="font-mono text-[9px] tracking-widest text-gray-500 pt-1">* {sale.invoiceNumber} *</p>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2.5">
            {printStatus && (
              <div className="text-center py-1.5 px-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-semibold animate-in fade-in flex items-center justify-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>{printStatus}</span>
              </div>
            )}

            {isInIframe && !printStatus && (
              <div className="text-[11px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg flex items-center justify-between border border-gray-200/60">
                <span>Sends directly to your device's installed printer.</span>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Standalone Tab</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {isWebSerialSupported() && (
                  <button
                    type="button"
                    onClick={handleSerialPrint}
                    className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Send ESC/POS commands directly to physical USB/Serial thermal receipt printer"
                  >
                    <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                    <span>USB POS</span>
                  </button>
                )}

                {isWebBluetoothSupported() && (
                  <button
                    type="button"
                    onClick={handleBluetoothPrint}
                    className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Connect and print to wireless Bluetooth POS printer"
                  >
                    <Radio className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Bluetooth</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Open dedicated print tab with native printer spooler invocation"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                  <span>Print Tab</span>
                </button>

                <button 
                  type="button"
                  disabled={isPrinting}
                  onClick={handlePrint}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  title="Open device printer spooler for your installed physical printer"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>{isPrinting ? "Opening Printer..." : "Print Receipt"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInvoiceModal && (
        <InvoiceModal
          sale={sale}
          settings={settings}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {showWaybillModal && (
        <WaybillModal
          sale={sale}
          settings={settings}
          onClose={() => setShowWaybillModal(false)}
        />
      )}
    </>
  );
}
