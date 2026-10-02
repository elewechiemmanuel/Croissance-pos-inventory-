import React, { useState, useContext, useMemo } from "react";
import { DataContext } from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import { apiCall } from "../lib/api";
import { Product } from "../types";
import { formatCurrency } from "../lib/utils";
import { Plus, Search, Edit2, Trash2, AlertCircle, Package } from "lucide-react";

export default function Products() {
  const { products = [], refreshData } = useContext(DataContext);
  const { user } = useAuth();
  
  // Robust check to catch different casing or boolean flags for admin
  const isAdmin = 
    user?.role === "admin" || 
    user?.role === "Admin" || 
    user?.role === "ADMIN" || 
    (user as any)?.isAdmin === true;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state including retail and wholesale prices
  const [formData, setFormData] = useState({
    name: "",
    category: "LPG",
    currentStock: 0,
    minStock: 100,
    unit: "kg",
    retailPrice: 0,
    wholesalePrice: 0,
    status: "Active"
  });

  // Categories filter list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p: Product) => p.category).filter(Boolean))) as string[];
    return ["ALL", ...cats];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const matchesCategory = selectedCategory === "ALL" || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = !searchTerm || 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleOpenModal = (product?: Product) => {
    setError("");
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || "",
        category: product.category || "LPG",
        currentStock: product.currentStock ?? 0,
        minStock: product.minStock ?? 100,
        unit: product.unit || "kg",
        retailPrice: product.retailPrice ?? 0,
        wholesalePrice: product.wholesalePrice ?? 0,
        status: product.status || "Active"
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        category: "LPG",
        currentStock: 0,
        minStock: 100,
        unit: "kg",
        retailPrice: 0,
        wholesalePrice: 0,
        status: "Active"
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Product name is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (editingProduct) {
        await apiCall("updateProduct", {
          id: editingProduct.id,
          ...formData
        });
      } else {
        await apiCall("addProduct", formData);
      }

      await refreshData();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await apiCall("deleteProduct", { id });
      await refreshData();
    } catch (err: any) {
      alert(err.message || "Failed to delete product.");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 bg-gray-50 min-h-[calc(100vh-2rem)] font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-2xs border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-blue-950 tracking-tight">Inventory & Products</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage stock levels, prices, and product categories.</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-2xs border border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-blue-900 text-white shadow-2xs"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {cat === "ALL" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-100">
                <th className="p-3.5 pl-4">Product Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Retail Price</th>
                <th className="p-3.5">Wholesale Price</th>
                <th className="p-3.5">Current Stock</th>
                <th className="p-3.5">Status</th>
                {isAdmin && <th className="p-3.5 pr-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">No products found.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product: Product) => {
                  const isLowStock = (product.currentStock ?? 0) <= (product.minStock ?? 50);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3.5 pl-4 font-bold text-gray-900">{product.name}</td>
                      <td className="p-3.5 text-gray-600 uppercase text-xs font-semibold tracking-wider">{product.category}</td>
                      <td className="p-3.5 font-medium text-gray-800">{formatCurrency(product.retailPrice ?? 0)}</td>
                      <td className="p-3.5 font-medium text-gray-800">{formatCurrency(product.wholesalePrice ?? 0)}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isLowStock ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {product.currentStock ?? 0} {product.unit || 'kg'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${product.status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {product.status || 'Active'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-3.5 pr-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenModal(product)}
                            className="p-1.5 bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-blue-950 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              {error && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cooking Gas 12.5kg"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="LPG / Fuel / Cylinder"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="kg / L / pcs"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Pricing Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Retail Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.retailPrice}
                    onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Wholesale Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.wholesalePrice}
                    onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}