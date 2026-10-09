import React, { useState, useContext, useMemo } from "react";
import { DataContext } from "../components/Layout";
import { Sale, WaybillData, Customer, Product } from "../types";
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
  ArrowUpRight,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Waybills() {
  const { sales = [], customers = [], products = [], settings, apiCall, refreshData } = useContext(DataContext) as any;

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSaleForWaybill, setSelectedSaleForWaybill] = useState<Sale | null>(null);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Local fallback state to ensure newly saved waybills appear immediately
  const [localCustomWaybills, setLocalCustomWaybills] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem("pos_custom_waybills");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // New Dispatch Creation State
  const [isCreatingWaybill, setIsCreatingWaybill] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  
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

  // Combined and filtered waybills list
  const waybillsList = useMemo(() => {
    // Merge context sales and local state to guarantee immediate visibility
    const allSalesMap = new Map<string, Sale>();
    
    // First load local storage custom waybills
    localCustomWaybills.forEach(w => allSalesMap.set(w.id || w.waybillNumber, w));
    
    // Then merge context sales
    (sales as Sale[]).forEach(s => {
      if (s.isCustomWaybill || (s.waybillNumber && s.waybillNumber.startsWith("WB-"))) {
        allSalesMap.set(s.id || s.waybillNumber, s);
      }
    });

    const combinedSales = Array.from(allSalesMap.values());

    const filtered = combinedSales.filter((sale) => {
      const waybillNum = sale.waybillNumber || "";
      const search = searchTerm.toLowerCase();

      const matchesItems = sale.items?.some(item => 
        item.productName?.toLowerCase().includes(search)
      );

      const matchesSearch = (
        !searchTerm ||
        waybillNum.toLowerCase().includes(search) ||
        sale.invoiceNumber?.toLowerCase().includes(search) ||
        sale.customerName?.toLowerCase().includes(search) ||
        (sale.vehicleNumber && sale.vehicleNumber.toLowerCase().includes(search)) ||
        (sale.driverName && sale.driverName.toLowerCase().includes(search)) ||
        (sale.deliveryAddress && sale.deliveryAddress.toLowerCase().includes(search)) ||
        matchesItems
      );

      let matchesDate = true;
      if (sale.date) {
        const saleDateOnly = new Date(sale.date).toISOString().split("T")[0];
        if (startDate && saleDateOnly < startDate) matchesDate = false;
        if (endDate && saleDateOnly > endDate) matchesDate = false;
      }

      return matchesSearch && matchesDate;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [sales, localCustomWaybills, searchTerm, startDate, endDate]);

  const totalUnitsDispatched = useMemo(() => {
    return waybillsList.reduce((sum, s) => {
      const saleUnits = s.items?.reduce((iSum, item) => iSum + (item.quantity || 0), 0) || 0;
      return sum + saleUnits;
    }, 0);
  }, [waybillsList]);

  const handleAddProductRow = (productId: string) => {
    const prod = products.find((p: Product) => p.id === productId);
    if (!prod) return;

    const retailPrice = prod.retailPrice || prod.sellingPrice || 0;
    const wholesalePrice = prod.wholesalePrice || prod.sellingPrice || 0;
    
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

  const buildWaybillPayload = () => {
    const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    const waybillNumber = `WB-${Math.floor(100000 + Math.random() * 900000)}`;
    const customerName = selectedCustomer?.fullName || selectedCustomer?.name || "Customer";

    return {
      id: `wb_local_${Date.now()}`,
      invoiceNumber,
      waybillNumber,
      isCustomWaybill: true,
      customerId: selectedCustomer?.id || "cust_walkin",
      customerName,
      customerPhone: selectedCustomer?.phone || "",
      deliveryAddress: deliveryAddress || selectedCustomer?.address || "Customer Location",
      vehicleNumber: vehicleNumber || "PENDING VEHICLE",
      driverName: driverName || "PENDING DRIVER",
      driverPhone: driverPhone || "",
      items: waybillItems,
      subtotal: calculatedSubtotal,
      discount: 0,
      totalAmount: calculatedSubtotal,
      paymentMethod,
      paymentStatus: "Completed",
      deliveryNotes: "Goods Received in Good Condition & Proper Order. Inspect all seals upon delivery.",
      date: new Date().toISOString()
    };
  };

  const handlePreSubmitCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setFormError("Please select a customer for this waybill.");
      return;
    }
    if (waybillItems.length === 0) {
      setFormError("Please add at least one product item.");
      return;
    }
    setFormError("");
    setShowConfirmModal(true); // Open the confirmation dialog box
  };

  const handleExecuteSaveCustomWaybill = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setFormError("");

    try {
      const newSalePayload = buildWaybillPayload();

      // Save to local state immediately so it renders without delay
      const updatedLocal = [newSalePayload, ...localCustomWaybills];
      setLocalCustomWaybills(updatedLocal);
      try {
        localStorage.setItem("pos_custom_waybills", JSON.stringify(updatedLocal));
      } catch (err) {
        console.error("Local storage error:", err);
      }

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

  const handleDownloadFromModal = () => {
    if (!selectedCustomer) {
      setFormError("Please select a customer before downloading.");
      return;
    }
    if (waybillItems.length === 0) {
      setFormError("Please add at least one product item before downloading.");
      return;
    }

    const previewPayload = buildWaybillPayload();
    const waybillData: WaybillData = {
      waybillNumber: previewPayload.waybillNumber,
      invoiceNumber: previewPayload.invoiceNumber,
      date: previewPayload.date,
      deliveryDate: new Date().toISOString(),
      customerId: previewPayload.customerId,
      customerName: previewPayload.customerName,
      customerPhone: previewPayload.customerPhone,
      deliveryAddress: previewPayload.deliveryAddress,
      dispatchStation: settings.stationAddress || settings.businessName,
      staffName: "Station Attendant",
      vehicleNumber: previewPayload.vehicleNumber,
      driverName: previewPayload.driverName,
      driverPhone: previewPayload.driverPhone,
      items: previewPayload.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit || "Unit",
        remarks: "Goods Received in Good Condition"
      })),
      deliveryNotes: previewPayload.deliveryNotes
    };

    downloadWaybillPdf(waybillData, settings);
  };

  const handleQuickDownload = (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(sale.id);
    const waybillNum = sale.waybillNumber || `WB-${(sale.invoiceNumber || "").replace("INV-", "")}`;
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
      items: (sale.items || []).map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit || "Unit",
        remarks: "Goods Received in Good Condition"
      })),
      deliveryNotes: sale.deliveryNotes || "Goods Received in Good Condition & Proper Order."
    };

    downloadWaybillPdf(waybillData, settings);
    setTimeout(() => setDownloadingId(null), 2500);
  };

  const handleQuickPrint = async (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    const waybillNum = sale.waybillNumber || `WB-${(sale.invoiceNumber || "").replace("INV-", "")}`;
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
      items: (sale.items || []).map(item => ({
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
            Dispatch management, product calculations, automated delivery notes, and payment integration
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
            <strong className="text-white">{settings.bankName || "FCMB"}</strong>
          </div>
          <div>
            <span className="text-gray-400 block">Account Number:</span>
            <strong className="text-amber-300 font-mono">{settings.accountNumber || "3429883013"}</strong>
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

      {/* Search and Date Filters */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Waybill #, Invoice #, Product (LPG, AGO)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs outline-none font-medium text-gray-800 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs outline-none font-medium text-gray-800 cursor-pointer"
            />
          </div>

          {(startDate || endDate || searchTerm) && (
            <button
              type="button"
              onClick={() => { setSearchTerm(""); setStartDate(""); setEndDate(""); }}
              className="text-xs text-amber-600 hover:underline font-bold px-2 py-1 cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Create Waybill Modal */}
      {isCreatingWaybill && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-blue-950 text-white flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>Create Custom Waybill &amp; Delivery Note (LPG, AGO &amp; Products)</span>
              </h3>
              <button 
                onClick={() => setIsCreatingWaybill(false)}
                className="text-gray-300 hover:text-white font-bold text-lg px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePreSubmitCheck} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Customer / Consignee</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="POS Terminal">POS Terminal</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
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

              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Select Products (LPG, AGO &amp; Products)</label>
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
                        {p.name} ({p.category || 'General'}) - Retail: {formatCurrency(p.retailPrice || p.sellingPrice || 0)} | Wholesale: {formatCurrency(p.wholesalePrice || p.sellingPrice || 0)}
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

                      <div className="flex items-center bg-gray-200 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleTogglePriceType(idx, "retail")}
                          className={`px-2 py-1 rounded-md font-bold text-[10px] transition-colors cursor-pointer ${item.selectedPriceType === "retail" ? "bg-white text-blue-900 shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                        >
                          Retail
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePriceType(idx, "wholesale")}
                          className={`px-2 py-1 rounded-md font-bold text-[10px] transition-colors cursor-pointer ${item.selectedPriceType === "wholesale" ? "bg-amber-500 text-white shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
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

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-start gap-2 text-xs text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Automated Delivery Note Included:</strong>
                  <span>"Goods Received in Good Condition &amp; Proper Order".</span>
                </div>
              </div>

              {/* Action Buttons: Save & Generate AND Download PDF */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingWaybill(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadFromModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Generating..." : "Save & Generate Waybill"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL (Are you sure you want to save this waybill?) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Are you sure you want to save this waybill?</h3>
              <p className="text-xs text-gray-500 mt-1">This will record the transaction and generate your dispatch entry immediately.</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                No (Cancel)
              </button>
              <button
                type="button"
                onClick={handleExecuteSaveCustomWaybill}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waybills Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Recent Waybills History</h3>
          <span className="text-xs text-gray-400">Showing {waybillsList.length} records</span>
        </div>

        {waybillsList.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3 stroke-[1.5]" />
            <p className="text-sm font-medium text-gray-600">No custom waybill records found.</p>
            <p className="text-xs text-gray-400 mt-1">Generate a waybill using the "Create Custom Waybill" button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-100">
                  <th className="py-3 px-4">Waybill #</th>
                  <th className="py-3 px-4">Invoice Ref</th>
                  <th className="py-3 px-4">Dispatch Date</th>
                  <th className="py-3 px-4">Consignee</th>
                  <th className="py-3 px-4">Destination &amp; Vehicle</th>
                  <th className="py-3 px-4">Dispatched Items</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {waybillsList.map((sale: Sale) => {
                  const waybillNum = sale.waybillNumber || `WB-${(sale.invoiceNumber || "").replace("INV-", "")}`;
                  return (
                    <tr key={sale.id || sale.waybillNumber} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-blue-900">{waybillNum}</td>
                      <td className="py-3 px-4 font-mono text-gray-600">{sale.invoiceNumber || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(sale.date)}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{sale.customerName || "Customer"}</div>
                        <div className="text-[11px] text-gray-400">{sale.customerPhone || ""}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-800 font-medium truncate max-w-xs">{sale.deliveryAddress || "N/A"}</div>
                        <div className="text-[11px] text-amber-600 font-mono mt-0.5">{sale.vehicleNumber || "PENDING VEHICLE"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-800 font-medium">
                          {sale.items?.length || 0} items ({sale.items?.reduce((acc: number, cur: any) => acc + (cur.quantity || 0), 0) || 0} units)
                        </div>
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">
                          {sale.items?.map((i: any) => `${i.productName} (${i.quantity})`).join(", ")}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleQuickDownload(sale, e)}
                            disabled={downloadingId === sale.id}
                            title="Download PDF"
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleQuickPrint(sale, e)}
                            title="Print Waybill"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSaleForWaybill(sale)}
                            title="View Details"
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals for viewing/printing detailed waybills or invoices */}
      {selectedSaleForWaybill && (
        <WaybillModal
          sale={selectedSaleForWaybill}
          settings={settings}
          onClose={() => setSelectedSaleForWaybill(null)}
        />
      )}

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