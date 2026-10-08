import React, { useState, useContext, useMemo } from "react";
import { DataContext } from "../components/Layout";
import { Sale, WaybillData, Customer, Product, SaleItem } from "../types";
import { formatDate, formatCurrency } from "../lib/utils";
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
  Plus,
  Trash2,
  Building2,
  ArrowUpRight
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Waybills() {
  const { sales = [], customers = [], products = [], settings, apiCall, refreshData } = useContext(DataContext) as any;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSaleForWaybill, setSelectedSaleForWaybill] = useState<Sale | null>(null);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // New Dispatch Creation State
  const [isCreatingWaybill, setIsCreatingWaybill] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  
  // Extended item state to track both retail and wholesale prices per row
  const [waybillItems, setWaybillItems] = useState<{ 
    productId: string; 
    productName: string; 
    quantity: number; 
    retailPrice: number; 
    wholesalePrice: number; 
    selectedPriceType: "retail" | "wholesale"; 
    unitPrice: number; 
    unit: string; 
    total: number 
  }[]>([]);

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Filter sales
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

  const totalUnitsDispatched = useMemo(() => {
    return waybillsList.reduce((sum, s) => {
      const saleUnits = s.items.reduce((iSum, item) => iSum + (item.quantity || 0), 0);
      return sum + saleUnits;
    }, 0);
  }, [waybillsList]);

  // Add product to custom waybill builder with both prices visible
  const handleAddProductRow = (productId: string) => {
    const prod = products.find((p: Product) => p.id === productId);
    if (!prod) return;

    const retailPrice = prod.retailPrice || prod.sellingPrice || 0;
    const wholesalePrice = prod.wholesalePrice || prod.sellingPrice || 0;
    
    // Auto-select wholesale if customer type is Wholesale, else retail
    const custType = selectedCustomer?.type || selectedCustomer?.pricingTier;
    const defaultType: "retail" | "wholesale" = custType === "Wholesale" ? "wholesale" : "retail";
    const initialUnitPrice = defaultType === "wholesale" ? wholesalePrice : retailPrice;

    setWaybillItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === productId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantity + 1;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          total: newQty * current.unitPrice
        };
        return updated;
      }
      return [...prev, {
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        retailPrice,
        wholesalePrice,
        selectedPriceType: defaultType,
        unitPrice: initialUnitPrice,
        unit: prod.unit || "L",
        total: initialUnitPrice
      }];
    });
  };

  const handleUpdateItemQty = (index: number, qtyStr: string) => {
    const qty = parseFloat(qtyStr) || 0;
    setWaybillItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = {
        ...item,
        quantity: qty,
        total: qty * item.unitPrice
      };
      return updated;
    });
  };

  const handleTogglePriceType = (index: number, priceType: "retail" | "wholesale") => {
    setWaybillItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      const newUnitPrice = priceType === "wholesale" ? item.wholesalePrice : item.retailPrice;
      updated[index] = {
        ...item,
        selectedPriceType: priceType,
        unitPrice: newUnitPrice,
        total: item.quantity * newUnitPrice
      };
      return updated;
    });
  };

  const handleRemoveItemRow = (index: number) => {
    setWaybillItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculatedSubtotal = useMemo(() => {
    return waybillItems.reduce((sum, item) => sum + item.total, 0);
  }, [waybillItems]);

  const handleSaveCustomWaybill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setFormError("Please select a customer for this waybill.");
      return;
    }
    if (waybillItems.length === 0) {
      setFormError("Please add at least one product item.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const waybillNumber = `WB-${Math.floor(100000 + Math.random() * 900000)}`;

      const customerName = selectedCustomer.fullName || selectedCustomer.name || "Customer";

      const newSalePayload = {
        invoiceNumber,
        waybillNumber,
        customerId: selectedCustomer.id,
        customerName,
        customerPhone: selectedCustomer.phone || "",
        deliveryAddress: deliveryAddress || selectedCustomer.address || "Customer Location",
        vehicleNumber: vehicleNumber || "PENDING VEHICLE",
        driverName: driverName || "PENDING DRIVER",
        driverPhone: driverPhone || "",
        items: waybillItems,
        subtotal: calculatedSubtotal,
        discount: 0,
        totalAmount: calculatedSubtotal,
        paymentMethod: "Bank Transfer",
        paymentStatus: "Pending",
        deliveryNotes: "Goods Received in Good Condition & Proper Order. Inspect all seals upon delivery.",
        date: new Date().toISOString()
      };

      if (apiCall) {
        await apiCall("addSale", newSalePayload);
        if (refreshData) await refreshData();
      }

      setIsCreatingWaybill(false);
      setWaybillItems([]);
      setVehicleNumber("");
      setDriverName("");
      setDriverPhone("");
      setDeliveryAddress("");
    } catch (err: any) {
      setFormError(err.message || "Failed to create waybill.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        remarks: "Goods Received in Good Condition"
      })),
      deliveryNotes: sale.deliveryNotes || "Goods Received in Good Condition & Proper Order. Ensure vehicle tank/seals are verified prior to discharge."
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
        remarks: "Goods Received in Good Condition"
      })),
      deliveryNotes: sale.deliveryNotes || "Goods Received in Good Condition & Proper Order."
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
            Dispatch management, product calculations, automated delivery notes, and bank details integration
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreatingWaybill(true)}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Waybill</span>
          </button>

          <Link
            to="/pos"
            className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-xs transition-colors cursor-pointer"
          >
            <span>POS Dispatch</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Company Bank Details Widget */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 text-white p-4 rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-800/80 rounded-xl">
            <Building2 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400">Attached Company Bank Details</h3>
            <p className="text-xs text-blue-200 mt-0.5">Printed automatically on invoices &amp; linked paperwork for client transfers</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs bg-blue-950/60 px-4 py-2.5 rounded-lg border border-blue-800/50">
          <div>
            <span className="text-gray-400 block">Bank Name:</span>
            <strong className="text-white">{settings.bankName || "Access Bank / Zenith Bank"}</strong>
          </div>
          <div>
            <span className="text-gray-400 block">Account Number:</span>
            <strong className="text-amber-300 font-mono">{settings.accountNumber || "0123456789"}</strong>
          </div>
          <div>
            <span className="text-gray-400 block">Account Name:</span>
            <strong className="text-white">{settings.accountName || settings.businessName || "Croissance Energy"}</strong>
          </div>
        </div>
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
            placeholder="Search by Waybill #, Invoice #, Consignee, Vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Create Waybill Modal / Drawer Form */}
      {isCreatingWaybill && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-blue-950 text-white flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>Create Custom Waybill &amp; Delivery Note (Retail &amp; Wholesale Prices)</span>
              </h3>
              <button 
                onClick={() => setIsCreatingWaybill(false)}
                className="text-gray-300 hover:text-white font-bold text-lg px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCustomWaybill} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {formError}
                </div>
              )}

              {/* Customer Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Customer / Consignee</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600"
                    value={selectedCustomer?.id || ""}
                    onChange={(e) => {
                      const found = customers.find((c: any) => c.id === e.target.value);
                      setSelectedCustomer(found || null);
                      if (found?.address) setDeliveryAddress(found.address);
                    }}
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c: any) => {
                      const displayName = c.fullName || c.name || "Unnamed Customer";
                      const displayType = c.type || c.pricingTier || "";
                      return (
                        <option key={c.id} value={c.id}>
                          {displayName} {displayType ? `(${displayType})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Delivery Address / Destination</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter destination address..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Logistics & Vehicle info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. ABC-123-XY"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver's Full Name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Driver Phone</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Product Selection & Dual Pricing Control */}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Select Products (Retail &amp; Wholesale Pricing Shown)</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddProductRow(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold rounded-lg px-3 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="">+ Add Product Item</option>
                    {products.map((p: Product) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Retail: {formatCurrency(p.retailPrice || p.sellingPrice || 0)} | Wholesale: {formatCurrency(p.wholesalePrice || p.sellingPrice || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {waybillItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{item.productName}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-3">
                          <span>Retail: <strong className="text-gray-700">{formatCurrency(item.retailPrice)}</strong></span>
                          <span>Wholesale: <strong className="text-gray-700">{formatCurrency(item.wholesalePrice)}</strong></span>
                        </div>
                      </div>

                      {/* Pricing Mode Toggle Buttons */}
                      <div className="flex items-center bg-gray-200 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleTogglePriceType(idx, "retail")}
                          className={`px-2 py-1 rounded-md font-bold text-[10px] transition-colors ${item.selectedPriceType === "retail" ? "bg-white text-blue-900 shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                        >
                          Retail
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePriceType(idx, "wholesale")}
                          className={`px-2 py-1 rounded-md font-bold text-[10px] transition-colors ${item.selectedPriceType === "wholesale" ? "bg-amber-500 text-white shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                        >
                          Wholesale
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                            className="w-16 px-2 py-1 text-center font-bold bg-white border border-gray-300 rounded-lg outline-none"
                          />
                          <span className="text-gray-400">{item.unit}</span>
                        </div>

                        <div className="font-bold text-blue-950 w-24 text-right">
                          <div>{formatCurrency(item.total)}</div>
                          <div className="text-[10px] text-gray-400 font-normal">@{formatCurrency(item.unitPrice)}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {waybillItems.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4 italic">No products added yet. Click "+ Add Product Item" above.</p>
                  )}
                </div>

                {waybillItems.length > 0 && (
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 font-bold text-sm">
                    <span>Calculated Total Amount:</span>
                    <span className="text-blue-950 text-base">{formatCurrency(calculatedSubtotal)}</span>
                  </div>
                )}
              </div>

              {/* Automated Delivery Note Notice */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-start gap-2 text-xs text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Automated Delivery Note Included:</strong>
                  <span>"Goods Received in Good Condition &amp; Proper Order" .</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingWaybill(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Generating..." : "Save & Generate Waybill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <p className="text-xs text-gray-400 mt-1">Waybills are automatically prepared or can be custom-created using the button above.</p>
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