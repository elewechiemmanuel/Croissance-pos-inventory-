import React, { useState, useContext, useMemo } from "react";
import { DataContext } from "../components/Layout";
import { Sale, WaybillData } from "../types";
import { formatDate } from "../lib/utils";
import { downloadWaybillPdf, printWaybill } from "../lib/waybillGenerator";
import WaybillModal from "../components/WaybillModal";
import InvoiceModal from "../components/InvoiceModal";
import { 
  Truck, 
  Search, 
  Download, 
  Printer, 
  Eye, 
  Check, 
  FileText, 
  MapPin, 
  User, 
  Navigation,
  ArrowUpRight
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Waybills() {
  const { sales = [], settings } = useContext(DataContext);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSaleForWaybill, setSelectedSaleForWaybill] = useState<Sale | null>(null);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter sales that have or can generate waybills
  const waybillsList = useMemo(() => {
    return (sales as Sale[]).filter((sale) => {
      const waybillNum = sale.waybillNumber || `WB-${sale.invoiceNumber.replace("INV-", "")}`;
      const search = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        waybillNum.toLowerCase().includes(search) ||
        sale.invoiceNumber.toLowerCase().includes(search) ||
        sale.customerName.toLowerCase().includes(search) ||
        (sale.vehicleNumber && sale.vehicleNumber.toLowerCase().includes(search)) ||
        (sale.driverName && sale.driverName.toLowerCase().includes(search)) ||
        (sale.deliveryAddress && sale.deliveryAddress.toLowerCase().includes(search))
      );
    });
  }, [sales, searchTerm]);

  // Total units dispatched across items
  const totalUnitsDispatched = useMemo(() => {
    return waybillsList.reduce((sum, s) => {
      const saleUnits = s.items.reduce((iSum, item) => iSum + (item.quantity || 0), 0);
      return sum + saleUnits;
    }, 0);
  }, [waybillsList]);

  const handleQuickDownload = (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(sale.id);
    const waybillNum = sale.waybillNumber || `WB-${sale.invoiceNumber.replace("INV-", "")}`;
    const waybillData: WaybillData = {
      waybillNumber: waybillNum,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      deliveryDate: new Date().toISOString(),
      customerId: sale.customerId,
      customerName: sale.customerName || "Valued Customer",
      customerPhone: sale.customerPhone,
      deliveryAddress: sale.deliveryAddress || sale.customerAddress || "Station Pickup / Customer Delivery Point",
      dispatchStation: settings.stationAddress || settings.businessName,
      staffName: sale.staffName || "Station Attendant",
      vehicleNumber: sale.vehicleNumber || "NOT SPECIFIED",
      driverName: sale.driverName || "Designated Transporter",
      driverPhone: sale.driverPhone || "N/A",
      items: sale.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit || "Unit",
        remarks: "Good Condition / Sealed"
      })),
      deliveryNotes: sale.deliveryNotes || "Ensure vehicle tank/seals and product volume are verified prior to discharge. Inspect all seals upon delivery."
    };

    downloadWaybillPdf(waybillData, settings);
    setTimeout(() => setDownloadingId(null), 2500);
  };

  const handleQuickPrint = async (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    const waybillNum = sale.waybillNumber || `WB-${sale.invoiceNumber.replace("INV-", "")}`;
    const waybillData: WaybillData = {
      waybillNumber: waybillNum,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      deliveryDate: new Date().toISOString(),
      customerId: sale.customerId,
      customerName: sale.customerName || "Valued Customer",
      customerPhone: sale.customerPhone,
      deliveryAddress: sale.deliveryAddress || sale.customerAddress || "Station Pickup / Customer Delivery Point",
      dispatchStation: settings.stationAddress || settings.businessName,
      staffName: sale.staffName || "Station Attendant",
      vehicleNumber: sale.vehicleNumber || "NOT SPECIFIED",
      driverName: sale.driverName || "Designated Transporter",
      driverPhone: sale.driverPhone || "N/A",
      items: sale.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit || "Unit",
        remarks: "Good Condition / Sealed"
      })),
      deliveryNotes: sale.deliveryNotes || "Ensure vehicle tank/seals and product volume are verified prior to discharge."
    };
    await printWaybill(waybillData, settings);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2.5">
            <Truck className="text-amber-500 w-7 h-7" />
            Waybill &amp; Delivery Notes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Dispatch management, transporter logistics, and official downloadable A4 PDF waybills
          </p>
        </div>

        <Link
          to="/pos"
          className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>New Dispatch from POS</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Waybill Dispatches</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{waybillsList.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Recorded delivery consignments</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs bg-gradient-to-br from-amber-50/50 to-white">
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Total Volume Dispatched</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{totalUnitsDispatched.toLocaleString()} Units</p>
          <p className="text-xs text-amber-700/80 mt-0.5">Fuel, LPG &amp; Lubricants in transit</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs bg-gradient-to-br from-blue-50/50 to-white">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Station / Depot</p>
          <p className="text-sm font-bold text-gray-800 mt-2 truncate">
            {settings.stationAddress || settings.businessName || "Croissance Depot"}
          </p>
          <p className="text-xs text-blue-600 mt-1">Official dispatching hub</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Waybill #, Invoice #, Consignee, Vehicle, Driver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Waybills Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Waybill #</th>
                <th className="px-5 py-3.5">Invoice Ref</th>
                <th className="px-5 py-3.5">Dispatch Date</th>
                <th className="px-5 py-3.5">Consignee</th>
                <th className="px-5 py-3.5">Destination &amp; Vehicle</th>
                <th className="px-5 py-3.5">Dispatched Items</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...waybillsList].reverse().map((sale: Sale) => {
                const waybillNum = sale.waybillNumber || `WB-${sale.invoiceNumber.replace("INV-", "")}`;
                const totalQty = sale.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
                return (
                  <tr key={sale.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-amber-700">
                      <button
                        onClick={() => setSelectedSaleForWaybill(sale)}
                        className="hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                      >
                        <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{waybillNum}</span>
                      </button>
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-blue-900">
                      <button
                        onClick={() => setSelectedSaleForInvoice(sale)}
                        className="hover:underline flex items-center gap-1 cursor-pointer"
                        title="View Linked Invoice"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>{sale.invoiceNumber}</span>
                      </button>
                    </td>

                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(sale.date)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-800">{sale.customerName || "Customer"}</div>
                      {sale.customerPhone && (
                        <div className="text-[11px] text-gray-400">{sale.customerPhone}</div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs">
                      <div className="flex items-center gap-1 text-gray-700">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {sale.deliveryAddress || sale.customerAddress || "Local Depot / Station Pickup"}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Vehicle: <strong className="text-gray-800">{sale.vehicleNumber || "Standard Logistics"}</strong>
                        {sale.driverName && <span> &bull; {sale.driverName}</span>}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-gray-700">
                      <span className="font-bold text-blue-900">{totalQty} units</span> across {sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
                      <div className="text-[11px] text-gray-400 truncate max-w-[180px]">
                        {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(", ")}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Download PDF button */}
                        <button
                          onClick={(e) => handleQuickDownload(sale, e)}
                          className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                          title="Download Waybill PDF"
                        >
                          {downloadingId === sale.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        {/* Print button */}
                        <button
                          onClick={(e) => handleQuickPrint(sale, e)}
                          className="p-1.5 text-gray-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Print Waybill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Edit & View Waybill */}
                        <button
                          onClick={() => setSelectedSaleForWaybill(sale)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Edit Logistics & View Waybill"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View &amp; Edit</span>
                        </button>

                        {/* Linked Invoice */}
                        <button
                          onClick={() => setSelectedSaleForInvoice(sale)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View Linked Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {waybillsList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-gray-600 text-base">No Waybills Dispatched</p>
                    <p className="text-xs text-gray-400 mt-1">Waybills are automatically prepared for all sales made at POS.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waybill Modal */}
      {selectedSaleForWaybill && (
        <WaybillModal
          sale={selectedSaleForWaybill}
          settings={settings}
          onClose={() => setSelectedSaleForWaybill(null)}
        />
      )}

      {/* Invoice Modal */}
      {selectedSaleForInvoice && (
        <InvoiceModal
          sale={selectedSaleForInvoice}
          settings={settings}
          onClose={() => setSelectedSaleForInvoice(null)}
        />
      )}
    </div>
  );
}
