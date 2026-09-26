import React, { useState, useEffect, useMemo } from "react";
import { Product } from "../types";
import { formatCurrency } from "../lib/utils";
import { apiCall } from "../lib/api";
import { 
  AlertTriangle, 
  Sliders, 
  Plus, 
  Download, 
  Copy, 
  Check, 
  ArrowRight, 
  DollarSign, 
  X, 
  Bell, 
  RefreshCw,
  TrendingDown,
  Layers,
  ChevronRight,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";

interface LowStockWidgetProps {
  products: Product[];
  onRefreshData?: () => void;
}

type ThresholdMode = "percentage" | "fixed";

export default function LowStockReplenishmentWidget({ products, onRefreshData }: LowStockWidgetProps) {
  // Persisted user-defined threshold configuration
  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>(() => {
    return (localStorage.getItem("croissance_threshold_mode") as ThresholdMode) || "percentage";
  });
  
  // Percentage buffer over minStock (e.g. 20% means alert when stock <= minStock * 1.2)
  const [bufferPercentage, setBufferPercentage] = useState<number>(() => {
    const saved = localStorage.getItem("croissance_threshold_buffer_pct");
    return saved !== null ? Number(saved) : 20;
  });

  // Fixed global threshold (alert if stock <= fixedUnits)
  const [fixedThreshold, setFixedThreshold] = useState<number>(() => {
    const saved = localStorage.getItem("croissance_threshold_fixed_units");
    return saved !== null ? Number(saved) : 100;
  });

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // UI state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  
  // Quick Restock Modal State
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(0);
  const [isRestocking, setIsRestocking] = useState(false);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("croissance_threshold_mode", thresholdMode);
  }, [thresholdMode]);

  useEffect(() => {
    localStorage.setItem("croissance_threshold_buffer_pct", String(bufferPercentage));
  }, [bufferPercentage]);

  useEffect(() => {
    localStorage.setItem("croissance_threshold_fixed_units", String(fixedThreshold));
  }, [fixedThreshold]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      const cat = (p as any).category;
      if (cat) set.add(cat);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  // Calculate items below user-defined threshold
  const itemsRequiringReplenishment = useMemo(() => {
    return products.map(product => {
      const p = product as any;
      const minStock = Number(p.minStock) || 0;
      const currentStock = Number(p.currentStock) || 0;
      
      // Calculate effective alert threshold for this product
      let effectiveThreshold = minStock;
      if (thresholdMode === "percentage") {
        effectiveThreshold = Math.ceil(minStock * (1 + bufferPercentage / 100));
      } else {
        effectiveThreshold = Math.max(minStock, fixedThreshold);
      }

      const isBelow = currentStock <= effectiveThreshold;
      
      // Determine urgency level
      let urgency: "out_of_stock" | "critical" | "warning" = "warning";
      if (currentStock <= 0) {
        urgency = "out_of_stock";
      } else if (currentStock <= minStock) {
        urgency = "critical";
      }

      // Recommended reorder quantity: replenish up to at least 2.5x minStock or a healthy buffer
      const targetStock = Math.max(minStock * 2.5, minStock + 50);
      const recommendedReorder = Math.max(0, Math.ceil(targetStock - currentStock));
      const estReorderCost = recommendedReorder * (Number(p.buyingPrice) || 0);

      // Stock health percent against threshold
      const healthPct = effectiveThreshold > 0 
        ? Math.min(100, Math.max(0, Math.round((currentStock / effectiveThreshold) * 100))) 
        : 100;

      return {
        product,
        minStock,
        currentStock,
        effectiveThreshold,
        isBelow,
        urgency,
        recommendedReorder,
        estReorderCost,
        healthPct
      };
    })
    .filter(item => item.isBelow)
    .filter(item => selectedCategory === "ALL" || (item.product as any).category === selectedCategory)
    .sort((a, b) => {
      // Sort by urgency: out of stock first, then lowest healthPct
      if (a.currentStock === 0 && b.currentStock > 0) return -1;
      if (b.currentStock === 0 && a.currentStock > 0) return 1;
      return a.healthPct - b.healthPct;
    });
  }, [products, thresholdMode, bufferPercentage, fixedThreshold, selectedCategory]);

  // Summary statistics for replenishment
  const totalRecommendedCost = useMemo(() => {
    return itemsRequiringReplenishment.reduce((sum, item) => sum + item.estReorderCost, 0);
  }, [itemsRequiringReplenishment]);

  const criticalCount = itemsRequiringReplenishment.filter(i => i.urgency !== "warning").length;

  // Quick Restock handler
  const handleOpenRestock = (product: Product, recommended: number) => {
    setRestockProduct(product);
    setRestockQty(recommended > 0 ? recommended : 50);
    setRestockSuccessMsg(null);
  };

  const handleConfirmRestock = async () => {
    if (!restockProduct || restockQty <= 0) return;
    setIsRestocking(true);
    try {
      const p = restockProduct as any;
      const newStock = Number(p.currentStock) + Number(restockQty);
      await apiCall("updateProduct", {
        id: p.id,
        currentStock: newStock,
        name: p.name,
        category: p.category,
        buyingPrice: p.buyingPrice,
        sellingPrice: p.sellingPrice,
        wholesalePrice: p.wholesalePrice,
        minStock: p.minStock,
        unit: p.unit,
        status: "Active"
      });

      setRestockSuccessMsg(`Successfully added ${restockQty} ${p.unit || 'units'} to ${p.name}!`);
      if (onRefreshData) {
        await onRefreshData();
      }
      setTimeout(() => {
        setRestockProduct(null);
        setRestockSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert("Failed to replenish stock: " + (err.message || "Unknown error"));
    } finally {
      setIsRestocking(false);
    }
  };

  // Copy replenishment summary
  const handleCopySummary = () => {
    if (itemsRequiringReplenishment.length === 0) return;
    
    let text = `*CROISSANCE OIL & GAS - INVENTORY REPLENISHMENT REPORT*\n`;
    text += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    text += `Threshold Criteria: ${thresholdMode === "percentage" ? `Min Stock + ${bufferPercentage}% Buffer` : `Fixed <= ${fixedThreshold} Units`}\n`;
    text += `Total Products Requiring Restock: ${itemsRequiringReplenishment.length}\n`;
    text += `Estimated Total Replenishment Cost: ${formatCurrency(totalRecommendedCost)}\n\n`;
    text += `--------------------------------------------------\n`;
    
    itemsRequiringReplenishment.forEach((item, idx) => {
      const p = item.product as any;
      text += `${idx + 1}. ${p.name} [${p.category}]\n`;
      text += `    Current Stock: ${item.currentStock} ${p.unit || 'units'} | Min Required: ${item.minStock}\n`;
      text += `    Recommended Order: ${item.recommendedReorder} ${p.unit || 'units'}\n`;
      text += `    Est. Cost: ${formatCurrency(item.estReorderCost)}\n`;
      text += `    Status: ${item.urgency === "out_of_stock" ? "DEPLETED (0 Stock)" : item.urgency === "critical" ? "CRITICAL (Below Min)" : "LOW (Near Buffer)"}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  // Export CSV Replenishment Purchase Order
  const handleExportCsv = () => {
    if (itemsRequiringReplenishment.length === 0) return;

    const headers = [
      "Product Name",
      "Category",
      "Current Stock",
      "Unit",
      "Min Stock Threshold",
      "Alert Threshold",
      "Recommended Reorder Qty",
      "Supplier Unit Price (NGN)",
      "Est. Total Cost (NGN)",
      "Stock Urgency"
    ];

    const rows = itemsRequiringReplenishment.map(item => {
      const p = item.product as any;
      return [
        `"${String(p.name || '').replace(/"/g, '""')}"`,
        `"${String(p.category || '')}"`,
        item.currentStock,
        `"${String(p.unit || 'Unit')}"`,
        item.minStock,
        item.effectiveThreshold,
        item.recommendedReorder,
        Number(p.buyingPrice) || 0,
        item.estReorderCost,
        item.urgency === "out_of_stock" ? "OUT OF STOCK" : item.urgency === "critical" ? "CRITICAL" : "LOW BUFFER"
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Replenishment_Order_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all">
      {/* Widget Header with Notification Counter & Threshold Controls */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 bg-white/10 rounded-xl backdrop-blur-xs text-amber-400">
              <Bell className="w-5 h-5" />
              {itemsRequiringReplenishment.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-blue-900 animate-pulse">
                  {itemsRequiringReplenishment.length}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Stock Replenishment Alerts</h2>
                {criticalCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-red-500/90 text-white rounded-full">
                    {criticalCount} Critical
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {itemsRequiringReplenishment.length === 0 
                  ? "All monitored inventory items are above replenishment thresholds"
                  : `${itemsRequiringReplenishment.length} products require restocking based on your active threshold rules`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isConfigOpen 
                  ? "bg-amber-400 text-blue-950 shadow-sm" 
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              title="Configure custom notification threshold"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Threshold Rules</span>
            </button>

            {itemsRequiringReplenishment.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Copy replenishment summary to clipboard for suppliers"
                >
                  {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Download Replenishment PO as CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapsible Threshold Configuration Bar */}
        {isConfigOpen && (
          <div className="mt-4 pt-4 border-t border-white/15 animate-in slide-in-from-top duration-200">
            <div className="bg-white/10 p-3.5 rounded-xl backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-amber-300">Replenishment Trigger Rule:</span>
                <p className="text-blue-100 text-[11px]">
                  Specify when products notify you for reordering before running dry.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Mode Selector */}
                <div className="flex items-center bg-black/20 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setThresholdMode("percentage")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      thresholdMode === "percentage"
                        ? "bg-amber-400 text-blue-950 shadow-xs"
                        : "text-blue-200 hover:text-white"
                    }`}
                  >
                    Buffer Above Min Stock (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setThresholdMode("fixed")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      thresholdMode === "fixed"
                        ? "bg-amber-400 text-blue-950 shadow-xs"
                        : "text-blue-200 hover:text-white"
                    }`}
                  >
                    Fixed Unit Cap
                  </button>
                </div>

                {/* Threshold input control */}
                {thresholdMode === "percentage" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-200">Buffer:</span>
                    <select
                      value={bufferPercentage}
                      onChange={(e) => setBufferPercentage(Number(e.target.value))}
                      className="bg-blue-950 border border-blue-700 text-white rounded-lg px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="0">0% (Exact Min Stock)</option>
                      <option value="10">+10% Early Warning</option>
                      <option value="20">+20% Recommended Buffer</option>
                      <option value="35">+35% Safe Logistics Buffer</option>
                      <option value="50">+50% High Volume Buffer</option>
                      <option value="100">+100% Double Min Stock</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-200">Notify if Stock &le;</span>
                    <input
                      type="number"
                      min="1"
                      value={fixedThreshold}
                      onChange={(e) => setFixedThreshold(Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-blue-950 border border-blue-700 text-white rounded-lg px-2 py-1 font-semibold text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <span className="text-blue-200">units</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Widget Filter & Subheader */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-500 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-900"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === "ALL" ? "All Categories" : cat}</option>
            ))}
          </select>
        </div>

        {itemsRequiringReplenishment.length > 0 && (
          <div className="flex items-center gap-3 text-gray-600">
            <span>
              Est. Restock Outlay: <strong className="text-gray-900 font-bold">{formatCurrency(totalRecommendedCost)}</strong>
            </span>
            <span className="text-gray-300">|</span>
            <Link
              to="/products"
              className="text-blue-900 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* List of Replenishment Items */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[380px] divide-y divide-gray-100">
        {itemsRequiringReplenishment.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Inventory Levels Healthy</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No products are currently below your threshold of{" "}
              {thresholdMode === "percentage" 
                ? `Minimum Stock + ${bufferPercentage}% buffer` 
                : `${fixedThreshold} units`}.
            </p>
          </div>
        ) : (
          itemsRequiringReplenishment.map((item) => {
            const p = item.product as any;
            return (
              <div 
                key={p.id}
                className="py-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 rounded-xl transition-colors"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-gray-900 truncate">
                      {p.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                      {p.category}
                    </span>
                    {item.urgency === "out_of_stock" ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                        DEPLETED
                      </span>
                    ) : item.urgency === "critical" ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                        BELOW MIN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        BUFFER ALERT
                      </span>
                    )}
                  </div>

                  {/* Stock bar & status */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="w-28 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          item.urgency === "out_of_stock" 
                            ? "bg-red-500 w-0" 
                            : item.urgency === "critical" 
                            ? "bg-red-500" 
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, item.healthPct))}%` }}
                      />
                    </div>
                    <span className="text-gray-500 text-[11px]">
                      Current: <strong className={item.currentStock <= item.minStock ? "text-red-600" : "text-amber-700"}>
                        {item.currentStock} {p.unit || 'units'}
                      </strong>
                      {" "}&bull;{" "}
                      Min: {item.minStock}
                      {" "}&bull;{" "}
                      Threshold: {item.effectiveThreshold}
                    </span>
                  </div>
                </div>

                {/* Replenish CTA and recommendations */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Recommended Order</p>
                    <p className="text-xs font-bold text-blue-900">
                      +{item.recommendedReorder} {p.unit || 'units'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      ~{formatCurrency(item.estReorderCost)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenRestock(item.product, item.recommendedReorder)}
                    className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Quickly log replenished stock delivery"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Restock</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Restock Dialog */}
      {restockProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            {(() => {
              const rp = restockProduct as any;
              return (
                <>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-900 rounded-lg">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Quick Stock Replenishment</h3>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{rp.name}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRestockProduct(null)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {restockSuccessMsg ? (
                    <div className="py-4 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <Check className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-emerald-800">{restockSuccessMsg}</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Current In Stock:</span>
                          <strong className="text-red-600 font-bold">{rp.currentStock} {rp.unit || 'units'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Minimum Stock Level:</span>
                          <span className="font-semibold">{rp.minStock} {rp.unit || 'units'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Supplier Buying Price:</span>
                          <span className="font-semibold">{formatCurrency(rp.buyingPrice || 0)}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 block">
                          Quantity Received / Added ({rp.unit || 'units'}):
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={restockQty}
                          onChange={(e) => setRestockQty(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                          autoFocus
                        />
                        <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
                          <span>New Total Stock:</span>
                          <strong className="text-emerald-700 font-bold">
                            {Number(rp.currentStock) + Number(restockQty || 0)} {rp.unit || 'units'}
                          </strong>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setRestockProduct(null)}
                          className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isRestocking || restockQty <= 0}
                          onClick={handleConfirmRestock}
                          className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          {isRestocking ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 text-amber-400" />
                              <span>Confirm Replenishment</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}