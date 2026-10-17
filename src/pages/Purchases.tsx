import React, { useContext, useState } from "react";
import { DataContext } from "../components/Layout";
import { Product, Purchase } from "../types";
import { Plus, Edit2, Check, X } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { apiCall } from "../lib/api";

export default function Purchases() {
  const { products, purchases, refreshData } = useContext(DataContext);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for inline editing purchase date
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [newDateValue, setNewDateValue] = useState("");
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Form state
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [supplierName, setSupplierName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getTodayString());

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
        totalCost,
        date: purchaseDate 
      });
      
      await refreshData();
      setIsAdding(false);
      setQuantity(""); 
      setUnitCost(""); 
      setSupplierName("");
      setPurchaseDate(getTodayString());
    } catch (error) {
      alert("Failed to record purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle saving modified purchase date
  const handleSaveDate = async (purchaseId: string) => {
    if (!newDateValue) return;
    setIsUpdatingDate(true);
    try {
      await apiCall("updatePurchaseDate", {
        id: purchaseId,
        date: newDateValue
      });
      await refreshData();
      setEditingPurchaseId(null);
    } catch (error) {
      alert("Failed to update purchase date");
    } finally {
      setIsUpdatingDate(false);
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input 
                required 
                type="date" 
                value={purchaseDate} 
                onChange={e => setPurchaseDate(e.target.value)} 
                className="w-full p-2 border rounded" 
              />
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
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...purchases].reverse().map((p: Purchase) => {
                // FIXED: Removed `new Date()` fallback so old records stay static
                const formattedDateString = (() => {
                  if (!p.date) return "N/A";
                  // Handle YYYY-MM-DD string format safely without timezone shifts
                  const parts = p.date.split("T")[0].split("-");
                  if (parts.length === 3) {
                    const [year, month, day] = parts;
                    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
                    if (!isNaN(dateObj.getTime())) {
                      return dateObj.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      });
                    }
                  }
                  return p.date;
                })();

                const isEditingThisRow = editingPurchaseId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">
                      {isEditingThisRow ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="date" 
                            value={newDateValue} 
                            onChange={e => setNewDateValue(e.target.value)} 
                            className="p-1 border rounded text-xs"
                          />
                          <button 
                            onClick={() => handleSaveDate(p.id)} 
                            disabled={isUpdatingDate}
                            className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                            title="Save Date"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingPurchaseId(null)} 
                            className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span>{formattedDateString}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{p.supplierName}</td>
                    <td className="px-6 py-4 font-medium">{p.productName}</td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">+{p.quantity}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(p.unitCost)}</td>
                    <td className="px-6 py-4 text-right font-bold">{formatCurrency(p.totalCost)}</td>
                    <td className="px-6 py-4 text-center">
                      {!isEditingThisRow && (
                        <button 
                          onClick={() => {
                            setEditingPurchaseId(p.id);
                            setNewDateValue(p.date ? p.date.split("T")[0] : getTodayString());
                          }} 
                          className="text-gray-400 hover:text-blue-900 transition-colors p-1"
                          title="Modify Date"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No purchases recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}