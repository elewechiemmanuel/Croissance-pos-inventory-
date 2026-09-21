import React, { useContext, useState } from "react";
import { DataContext } from "../components/Layout";
import { Product, Purchase } from "../types";
import { Plus, PackagePlus } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";
import { apiCall } from "../lib/api";
import { useAuth } from "../store/AuthContext";

export function Purchases() {
  const { products, purchases, refreshData } = useContext(DataContext);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mode: existing product selection or create new SKU
  const [isNewSkuMode, setIsNewSkuMode] = useState(false);

  // Form state for existing purchase
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [supplierName, setSupplierName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");

  // Form state for New SKU creation
  const [newSkuName, setNewSkuName] = useState("");
  const [newSkuCategory, setNewSkuCategory] = useState("Lubricants / Station Product");
  const [newSkuPrice, setNewSkuPrice] = useState("");

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let targetProductId = productId;
      let targetProductName = "";

      if (isNewSkuMode && isAdmin) {
        if (!newSkuName.trim() || !newSkuPrice) {
          alert("Please provide valid name and selling price for the new SKU.");
          setIsSubmitting(false);
          return;
        }

        // 1. Create the new product SKU first
        const newProductPayload = {
          name: newSkuName.trim(),
          category: newSkuCategory,
          price: Number(newSkuPrice),
          stock: Number(quantity) || 0
        };

        const createdProductResponse: any = await apiCall("addProduct", newProductPayload);
        targetProductId = createdProductResponse?.id || `prod_${Date.now()}`;
        targetProductName = newSkuName.trim();
      } else {
        const product = products.find((p: Product) => p.id === productId);
        targetProductName = product?.name || "";
      }

      const totalCost = Number(quantity) * Number(unitCost);
      
      // 2. Record the purchase/restock
      await apiCall("addPurchase", {
        productId: targetProductId,
        productName: targetProductName,
        supplierName,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        totalCost
      });
      
      await refreshData();
      setIsAdding(false);
      setIsNewSkuMode(false);
      setQuantity(""); 
      setUnitCost(""); 
      setSupplierName("");
      setNewSkuName("");
      setNewSkuPrice("");
    } catch (error: any) {
      alert(error.message || "Failed to record purchase or create SKU");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-blue-900">Purchase &amp; Restock</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Receive Stock
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Record New Stock Receipt</h2>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsNewSkuMode(!isNewSkuMode)}
                className="text-xs font-semibold text-blue-900 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 cursor-pointer"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                {isNewSkuMode ? "Select Existing Product SKU" : "+ Create New Product SKU"}
              </button>
            )}
          </div>

          <form onSubmit={handleAddPurchase} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isNewSkuMode && isAdmin ? (
              <div className="md:col-span-2 p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-4">
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1">
                  <PackagePlus className="w-4 h-4 text-blue-800" />
                  New Product SKU Specification (Admin)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Product / Item Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Total 20W-50 Engine Oil"
                      value={newSkuName}
                      onChange={e => setNewSkuName(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={newSkuCategory}
                      onChange={e => setNewSkuCategory(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price (₦) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 4500"
                      value={newSkuPrice}
                      onChange={e => setNewSkuPrice(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select 
                  required 
                  value={productId} 
                  onChange={e => setProductId(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                >
                  {products.map((p: Product) => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
              <input required type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm" placeholder="e.g. Mobil Nigeria Distributor" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Purchased</label>
              <input required type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (₦)</label>
              <input required type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm" placeholder="0.00" />
            </div>
            
            <div className="md:col-span-2 flex justify-between items-center mt-2 border-t pt-4">
              <div className="text-lg font-bold text-gray-700">
                Total Cost: <span className="text-blue-900">{formatCurrency(Number(quantity) * Number(unitCost) || 0)}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setIsAdding(false); setIsNewSkuMode(false); }} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
                  {isSubmitting ? "Processing..." : isNewSkuMode ? "Create SKU & Record Purchase" : "Record Purchase"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3 text-right">Qty</th>
                <th className="px-6 py-3 text-right">Unit Cost</th>
                <th className="px-6 py-3 text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...purchases].reverse().map((p: Purchase) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{formatDate(p.date)}</td>
                  <td className="px-6 py-4">{p.supplierName}</td>
                  <td className="px-6 py-4 font-medium">{p.productName}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">+{p.quantity}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(p.unitCost)}</td>
                  <td className="px-6 py-4 text-right font-bold">{formatCurrency(p.totalCost)}</td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No purchases recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Purchases;