import React, { useContext, useState } from "react";
import { DataContext } from "../components/Layout";
import { Product, Purchase } from "../types";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";
import { apiCall } from "../lib/api";

export default function Purchases() {
  const { products, purchases, refreshData } = useContext(DataContext);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [supplierName, setSupplierName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const product = products.find((p: Product) => p.id === productId);
      const totalCost = Number(quantity) * Number(unitCost);
      
      await apiCall("addPurchase", {
        productId,
        productName: product?.name || "",
        supplierName,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        totalCost
      });
      
      await refreshData();
      setIsAdding(false);
      setQuantity(""); setUnitCost(""); setSupplierName("");
    } catch (error) {
      alert("Failed to record purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-blue-900">Purchase & Restock</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Receive Stock
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">Record New Stock Receipt</h2>
          <form onSubmit={handleAddPurchase} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select required value={productId} onChange={e => setProductId(e.target.value)} className="w-full p-2 border rounded bg-white">
                {products.map((p: Product) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
              <input required type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input required type="number" min="1" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (₦)</label>
              <input required type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            
            <div className="md:col-span-2 flex justify-between items-center mt-2 border-t pt-4">
              <div className="text-lg font-bold text-gray-700">
                Total Cost: <span className="text-blue-900">{formatCurrency(Number(quantity) * Number(unitCost) || 0)}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Record Purchase"}
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
