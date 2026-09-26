import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../store/AuthContext";
import { apiCall } from "../lib/api";
import { Edit2, Trash2, Plus, AlertCircle, Package } from "lucide-react";
import { formatCurrency } from "../lib/utils";

export default function Products() {
  const { products, loading } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    unit: "KG",
    buyingPrice: "",
    sellingPrice: "",
    wholesalePrice: "",
    openingStock: "",
    minStock: "",
    status: "Active"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      category: "",
      unit: "KG",
      buyingPrice: "",
      sellingPrice: "",
      wholesalePrice: "",
      openingStock: "",
      minStock: "",
      status: "Active"
    });
    setEditingProduct(null);
    setShowNewCategoryInput(false);
    setNewCategoryName("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (product: any) => {
    if (!isAdmin) {
      alert("Access Denied: Only administrators can edit products.");
      return;
    }
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      unit: product.unit || "KG",
      buyingPrice: product.buyingPrice?.toString() || "",
      sellingPrice: product.sellingPrice?.toString() || "",
      wholesalePrice: product.wholesalePrice?.toString() || "",
      openingStock: (product.openingStock ?? product.currentStock)?.toString() || "",
      minStock: product.minStock?.toString() || "",
      status: product.status || "Active"
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (product: any) => {
    if (!isAdmin) {
      alert("Access Denied: Only administrators can delete products.");
      return;
    }

    const productId = product.id || product._id;
    if (!productId) {
      alert("Error: Product identifier missing.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      await apiCall("deleteProduct", { id: productId });
      // Force reload to update state immediately from Firestore
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert(`Error deleting product: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Access Denied: Only administrators can save or modify products.");
      return;
    }

    setIsLoading(true);

    try {
      const finalCategory = showNewCategoryInput ? newCategoryName : formData.category;
      const initialStock = Number(formData.openingStock) || 0;
      const productId = editingProduct?.id || editingProduct?._id;

      const payload = {
        ...(productId ? { id: productId } : {}),
        name: formData.name,
        sku: formData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        category: finalCategory || "General",
        unit: formData.unit,
        buyingPrice: Number(formData.buyingPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        wholesalePrice: Number(formData.wholesalePrice) || 0,
        openingStock: initialStock,
        currentStock: editingProduct ? (editingProduct.currentStock ?? initialStock) : initialStock, 
        minStock: Number(formData.minStock) || 0,
        status: formData.status || "Active",
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        if (!productId) throw new Error("Editing product ID is missing.");
        await apiCall("updateProduct", payload);
      } else {
        await apiCall("addProduct", payload);
      }

      setIsModalOpen(false);
      resetForm();
      // Force reload to sync UI state with Firestore changes instantly
      window.location.reload();
    } catch (error) {
      console.error("Failed to save product:", error);
      alert(`Error saving product: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-2xs border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">Products Inventory</h1>
          <p className="text-xs text-gray-500 mt-1">Manage station products, wholesale pricing, and stock levels</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-gray-600 text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Name</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Unit</th>
                <th className="px-4 py-3.5">Cost Price</th>
                <th className="px-4 py-3.5">Retail Price</th>
                <th className="px-4 py-3.5">Wholesale Price</th>
                <th className="px-4 py-3.5">Stock</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
                    <p className="text-xs">Loading inventory products...</p>
                  </td>
                </tr>
              ) : products && products.length > 0 ? (
                products.map((product: any) => (
                  <tr key={product.id || product._id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-gray-900">{product.name}</td>
                    <td className="px-4 py-3.5">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600 font-medium">{product.unit}</td>
                    <td className="px-4 py-3.5 text-gray-800">{formatCurrency(Number(product.buyingPrice || 0))}</td>
                    <td className="px-4 py-3.5 font-bold text-blue-950">{formatCurrency(Number(product.sellingPrice || 0))}</td>
                    <td className="px-4 py-3.5 text-purple-900 font-semibold">{formatCurrency(Number(product.wholesalePrice || 0))}</td>
                    <td className="px-4 py-3.5 font-bold text-blue-600">
                      {product.currentStock ?? product.openingStock ?? 0}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          product.status === "Active" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {product.status || "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(product)}
                            className="p-1.5 text-gray-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm text-gray-600">No products found</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add New Product" to populate your inventory.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-blue-950 text-white">
              <h3 className="font-bold text-base">
                {editingProduct ? "Edit Product Details" : "Register New Product"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Premium Motor Spirit (PMS)"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">SKU Code</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Category *</label>
                  <input
                    type="text"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="e.g. Fuels / Lubricants"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Unit of Measure *</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
                  >
                    <option value="LTR">Liters (LTR)</option>
                    <option value="KG">Kilograms (KG)</option>
                    <option value="DRUM">Drum</option>
                    <option value="PC">Pieces (PC)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cost Price (₦)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="buyingPrice"
                    value={formData.buyingPrice}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Retail Price (₦) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="sellingPrice"
                    required
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 font-bold text-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Wholesale Price (₦)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="wholesalePrice"
                    value={formData.wholesalePrice}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 font-bold text-purple-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Opening Stock *</label>
                  <input
                    type="number"
                    name="openingStock"
                    required
                    value={formData.openingStock}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Min. Stock Alert Level</label>
                  <input
                    type="number"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}