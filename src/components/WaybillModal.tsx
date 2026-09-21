import React, { useState } from "react";
import { Sale, Settings, WaybillData } from "../types";
import { formatDate } from "../lib/utils";
import { downloadWaybillPdf, printWaybill, generateWaybillHtml } from "../lib/waybillGenerator";
import { openStandalonePrintView } from "../lib/printerService";
import { Truck, Printer, Download, X, Check, Edit2, ShieldAlert, ExternalLink } from "lucide-react";

interface WaybillModalProps {
  sale: Sale;
  settings: Settings;
  onClose: () => void;
}

export default function WaybillModal({ sale, settings, onClose }: WaybillModalProps) {
  // Pre-generate a waybill number if not already present on sale
  const waybillNumber = sale.waybillNumber || `WB-${sale.invoiceNumber.replace("INV-", "")}`;

  const [vehicleNumber, setVehicleNumber] = useState(sale.vehicleNumber || "");
  const [driverName, setDriverName] = useState(sale.driverName || "");
  const [driverPhone, setDriverPhone] = useState(sale.driverPhone || "");
  const [deliveryAddress, setDeliveryAddress] = useState(
    sale.deliveryAddress || sale.customerAddress || "Station Pickup / Customer Delivery Destination"
  );
  const [deliveryNotes, setDeliveryNotes] = useState(
    sale.deliveryNotes || "Ensure vehicle tank/seals and product volume are verified prior to discharge. Inspect all seals upon delivery."
  );
  const [showConfig, setShowConfig] = useState(!sale.vehicleNumber && !sale.driverName);
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const waybillData: WaybillData = {
    waybillNumber,
    invoiceNumber: sale.invoiceNumber,
    date: sale.date,
    deliveryDate: new Date().toISOString(),
    customerId: sale.customerId,
    customerName: sale.customerName || "Valued Customer",
    customerPhone: sale.customerPhone,
    deliveryAddress,
    dispatchStation: settings.stationAddress || settings.businessName,
    staffName: sale.staffName || "Station Attendant",
    vehicleNumber: vehicleNumber.trim() || "Not Specified",
    driverName: driverName.trim() || "Designated Transporter",
    driverPhone: driverPhone.trim() || "N/A",
    items: sale.items.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit || "Unit",
      remarks: "Good Condition / Sealed"
    })),
    deliveryNotes
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus("Accessing printer...");
    try {
      const ok = await printWaybill(waybillData, settings);
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
    const html = generateWaybillHtml(waybillData, settings);
    openStandalonePrintView(html, `Waybill_${waybillData.waybillNumber}`);
    setPrintStatus("Opened in dedicated print tab!");
    setTimeout(() => setPrintStatus(null), 3000);
  };

  const handleDownload = () => {
    downloadWaybillPdf(waybillData, settings);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-amber-600 text-white border-b border-amber-700">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-base leading-tight">Waybill &amp; Goods Delivery Note</h3>
              <p className="text-xs text-amber-100"># {waybillNumber} &bull; Linked Invoice: {sale.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-amber-700 rounded-full transition-colors text-amber-100 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-amber-50/50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{showConfig ? "Hide Transport Fields" : "Edit Vehicle / Driver"}</span>
            </button>
            <span className="text-xs text-gray-500 hidden sm:inline">
              Consignee: <strong className="text-gray-800">{sale.customerName || "Customer"}</strong>
            </span>
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
                  <span className="text-emerald-700">Waybill Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-700" />
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

        {/* Collapsible Edit Transport Details */}
        {showConfig && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-600" />
              Dispatch &amp; Carrier Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Truck / Vehicle Reg No:</label>
                <input
                  type="text"
                  placeholder="e.g. KTU-482XA"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Driver's Full Name:</label>
                <input
                  type="text"
                  placeholder="Driver / Carrier name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Driver's Contact Phone:</label>
                <input
                  type="text"
                  placeholder="e.g. 08012345678"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-gray-600 font-medium mb-1">Destination Address / Offloading Point:</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Special Delivery Remarks:</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Document Preview */}
        <div className="p-6 overflow-y-auto bg-gray-100 flex-1 flex justify-center">
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 text-gray-800 w-full max-w-2xl font-sans text-xs">
            {/* Top Amber Ribbon */}
            <div className="h-1.5 bg-amber-600 -mx-8 -mt-8 mb-6 rounded-t-xl" />

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
                    <strong>Station / Depot:</strong> {settings.stationAddress}
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
                <span className="text-lg sm:text-xl font-black text-amber-600 tracking-wide uppercase">
                  WAYBILL / DELIVERY NOTE
                </span>
                <p className="font-bold text-sm text-gray-900 mt-1"># {waybillNumber}</p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">
                  <strong>Invoice Ref:</strong> {sale.invoiceNumber}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  <strong>Dispatch Date:</strong> {formatDate(sale.date)}
                </p>
              </div>
            </div>

            {/* Consignee & Transporter Info Cards */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-200 text-xs">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Consignee Destination:</p>
                <p className="font-bold text-sm text-gray-900">{sale.customerName || "Customer"}</p>
                <p className="text-gray-700 mt-0.5 font-medium">Destination: {deliveryAddress}</p>
                {sale.customerPhone && <p className="text-gray-600 mt-0.5">Phone: {sale.customerPhone}</p>}
              </div>

              <div className="bg-amber-50/40 p-3 rounded-lg border border-amber-100">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Carrier &amp; Truck Details:</p>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-600">Truck / Vehicle No:</span>
                  <span className="font-bold text-blue-900">{vehicleNumber || "Not Specified"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-600">Driver's Name:</span>
                  <span className="font-semibold text-gray-800">{driverName || "Designated Driver"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-600">Driver Phone:</span>
                  <span>{driverPhone || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Goods Dispatched Table */}
            <table className="w-full my-4 text-left border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 text-center w-10">S/N</th>
                  <th className="py-2.5 px-3">Product / Goods Description</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-center">Qty Dispatched</th>
                  <th className="py-2.5 px-3 text-center">Qty Received</th>
                  <th className="py-2.5 px-3">Condition / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sale.items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-center text-gray-500">{i + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{item.productName}</td>
                    <td className="py-2.5 px-3 text-center text-gray-600">{item.unit || "Unit"}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-gray-900 text-sm">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-center text-gray-400 font-mono">_______</td>
                    <td className="py-2.5 px-3 text-gray-700 text-[11px]">Good Condition / Sealed</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Notice Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 my-4 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Delivery &amp; Safety Instructions:</p>
                <p className="text-amber-800 text-[10.5px] mt-0.5">{deliveryNotes}</p>
              </div>
            </div>

            {/* 3 Signatures */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-4 border-t border-dashed border-gray-300 text-center">
              <div>
                <div className="border-t border-gray-400 pt-1 text-[10px] text-gray-700">
                  <strong>DISPATCHED BY</strong><br />
                  <span>{sale.staffName || "Station Officer"}</span><br />
                  <span className="text-gray-400 text-[9px]">Sign, Date &amp; Stamp</span>
                </div>
              </div>
              <div>
                <div className="border-t border-gray-400 pt-1 text-[10px] text-gray-700">
                  <strong>CARRIER / DRIVER</strong><br />
                  <span>{driverName || "Driver / Transporter"}</span><br />
                  <span className="text-gray-400 text-[9px]">Sign &amp; Date (In Transit)</span>
                </div>
              </div>
              <div>
                <div className="border-t border-gray-400 pt-1 text-[10px] text-gray-700">
                  <strong>RECEIVED BY (CONSIGNEE)</strong><br />
                  <span>{sale.customerName || "Customer"}</span><br />
                  <span className="text-gray-400 text-[9px]">Sign, Date &amp; Stamp</span>
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
              title="Open standalone waybill in dedicated print window"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
              <span>Print Tab</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Waybill</span>
            </button>
            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Send to physical printer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isPrinting ? "Accessing..." : "Print Waybill"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
