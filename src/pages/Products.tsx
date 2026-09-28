import React, { useState, useContext } from "react";
import { DataContext } from "../components/Layout";
import { apiCall } from "../lib/api";
import { formatCurrency } from "../lib/utils";
import { Product } from "../types";
import { Edit2, Trash2, PlusCircle, PackagePlus, AlertCircle } from "lucide-react";

export default function Products() {
  const { products = [], loading, refreshData } = useContext(DataContext) as { products: Product[]; loading: boolean; refreshData: () => Promise<void> };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<string>("");
  
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    unit: "L",
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
      unit: "L",
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

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      unit: product.unit || "L",
      buyingPrice: product.buyingPrice?.toString() || "",
      sellingPrice: product.sellingPrice?.toString() || "",
      wholesalePrice: product.wholesalePrice?.toString() || "",
      openingStock: product.currentStock?.toString() || product.openingStock?.toString() || "0",
      minStock: product.minStock?.toString() || "10",
      status: product.status || "Active"
    });
    setIsModalOpen(true);
  };

  const handleOpenRestock = (product: Product) => {
    setRestockingProduct(product);
    setRestockQty("");
    setIsRestockModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const finalCategory = showNewCategoryInput ? newCategoryName : formData.category;
      const initialStock = Number(formData.openingStock) || 0;

      const payload = {
        name: formData.name,
        sku: formData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        category: finalCategory || "General",
        unit: formData.unit,
        buyingPrice: Number(formData.buyingPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        wholesalePrice: Number(formData.wholesalePrice) || 0,
        minStock: Number(formData.minStock) || 0,
        status: formData.status || "Active",
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        await apiCall("updateProduct", { ...payload, id: editingProduct.id });
      } else {
        await apiCall("addProduct", {
          ...payload,
          openingStock: initialStock,
          currentStock: initialStock
        });
      }

      setIsModalOpen(false);
      resetForm();
      await refreshData();
    } catch (error: any) {
      console.error("Failed to save product:", error);
      alert(`Error saving product: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingProduct) return;
    
    const qtyToAdd = Number(restockQty);
    if (qtyToAdd <= 0) {
      alert("Please enter a valid stock quantity to receive.");
      return;
    }

    setIsLoading(true);
    try {
      const currentStock = restockingProduct.currentStock ?? restockingProduct.openingStock ?? 0;
      const updatedStock = currentStock + qtyToAdd;

      await apiCall("updateProduct", {
        id: restockingProduct.id,
        currentStock: updatedStock,
        updatedAt: new Date().toISOString()
      });

      setIsRestockModalOpen(false);
      setRestockingProduct(null);
      setRestockQty("");
      await refreshData();
    } catch (error: any) {
      console.error("Failed to receive stock:", error);
      alert(`Error receiving stock: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return;

    try {
      await apiCall("deleteProduct", { id: productId });
      await refreshData();
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      alert(`Error deleting product: ${error.message || "Unknown error"}`);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">Products Inventory</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage stock levels, retail pricing, and wholesale pricing</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-900 text-white px-4 py-2 rounded-xl hover:bg-blue-800 transition font-semibold text-sm shadow-2xs cursor-pointer flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4 text-amber-400" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600 text-xs font-semibold tracking-wider">
              <th className="p-4">NAME</th>
              <th className="p-4">CATEGORY</th>
              <th className="p-4">UNIT</th>
              <th className="p-4">COST PRICE</th>
              <th className="p-4">RETAIL PRICE</th>
              <th className="p-4">WHOLESALE PRICE</th>
              <th className="p-4">STOCK</th>
              <th className="p-4">STATUS</th>
              <th className="p-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400 text-sm">
                  Loading inventory products...
                </td>
              </tr>
            ) : products && products.length > 0 ? (
              products.map((product: any) => {
                const stockVal = product.currentStock ?? product.openingStock ?? 0;
                return (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50/60 text-xs transition-colors">
                    <td className="p-4 font-bold text-gray-900">{product.name}</td>
                    <td className="p-4 text-gray-600">{product.category}</td>
                    <td className="p-4 text-gray-500 font-medium">{product.unit || 'L'}</td>
                    <td className="p-4 text-gray-700">{formatCurrency(product.buyingPrice || 0)}</td>
                    <td className="p-4 font-bold text-blue-900">{formatCurrency(product.sellingPrice || 0)}</td>
                    <td className="p-4 font-semibold text-amber-800">{formatCurrency(product.wholesalePrice || 0)}</td>
                    <td className="p-4 font-bold text-blue-600">
                      <span className={`px-2 py-0.5 rounded-full ${stockVal > (product.minStock || 10) ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                        {stockVal} {product.unit || 'L'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-semibold ${product.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {product.status || "Active"}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenRestock(product)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Receive Stock (Restock)"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold hidden md:inline">Restock</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(product)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Edit product details & pricing"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold hidden md:inline">Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400 text-sm">
                  No products found. Add your first product above!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-blue-950 mb-4">
              {editingProduct ? "Edit Product & Adjust Prices" : "Add New Product"}
            </h2>
            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. AGO (Diesel) or PMS"
                  className="w-full border border-gray-300 p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  {showNewCategoryInput ? (
                    <input
                      type="text"
                      placeholder="Enter new category"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full border border-gray-300 p-2.5 rounded-xl text-xs outline-none"
                    />
                  ) : (
                    <select
                      name="category"
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === "ADD_NEW") {
                          setShowNewCategoryInput(true);
                        } else {
                          handleInputChange(e);
                        }
                      }}
                      className="w-full border border-gray-300 p-2.5 rounded-xl text-xs outline-none bg-white font-medium"
                    >
                      <option value="">Select Category</option>
                      <option value="Fuel">Fuel</option>
                      <option value="LPG">LPG</option>
                      <option value="Lubricants">Lubricants</option>
                      <option value="General">General</option>
                      <option value="ADD_NEW">+ Add New Category</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Measurement Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-2.5 rounded-xl text-xs outline-none bg-white font-medium"
                  >
                    <option value="L">Liters (L)</option>
                    <option value="KG">Kilograms (KG)</option>
                    <option value="Pcs">Pieces (Pcs)</option>
                    <option value="Drum">Drum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Buying Price (₦)</label>
                  <input
                    type="number"
                    step="any"
                    name="buyingPrice"
                    value={formData.buyingPrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full border border-gray-300 p-2.5 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1">Retail Price (₦)</label>
                  <input
                    type="number"
                    step="any"
                    name="sellingPrice"
                    required
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full border border-blue-400 bg-blue-50/40 p-2.5 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Wholesale Price (₦)</label>
                  <input
                    type="number"
                    step="any"
                    name="wholesalePrice"
                    value={formData.wholesalePrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full border border-amber-400 bg-amber-50/40 p-2.5 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {!editingProduct && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Opening Stock</label>
                    <input
                      type="number"
                      step="any"
                      name="openingStock"
                      value={formData.openingStock}
                      onChange={handleInputChange}
                      placeholder="e.g. 1000"
                      className="w-full border border-gray-300 p-2.5 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Min Stock Alert</label>
                    <input
                      type="number"
                      step="any"
                      name="minStock"
                      value={formData.minStock}
                      onChange={handleInputChange}
                      placeholder="e.g. 50"
                      className="w-full border border-gray-300 p-2.5 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold hover:bg-blue-800 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isLoading ? "Saving..." : editingProduct ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Stock (Restock) Modal */}
      {isRestockModalOpen && restockingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-blue-950 mb-1">Receive Stock</h2>
            <p className="text-xs text-gray-500 mb-4">
              Adding stock to <strong className="text-gray-800">{restockingProduct.name}</strong> (Current: {restockingProduct.currentStock ?? restockingProduct.openingStock ?? 0} {restockingProduct.unit || 'L'})
            </p>

            <form onSubmit={handleReceiveStock} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity to Receive ({restockingProduct.unit || 'L'})</label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-blue-950 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isLoading ? "Processing..." : "Confirm Restock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}