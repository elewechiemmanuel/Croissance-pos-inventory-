import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { apiCall } from "../lib/api";

export default function Products() {
  const { products, loading } = useData();

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

  // --- OPEN MODAL FOR EDITING ---
  const handleEditClick = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      unit: product.unit || "KG",
      buyingPrice: product.buyingPrice?.toString() || "",
      sellingPrice: product.sellingPrice?.toString() || "",
      wholesalePrice: product.wholesalePrice?.toString() || "",
      openingStock: product.openingStock?.toString() || "",
      minStock: product.minStock?.toString() || "",
      status: product.status || "Active"
    });
    setIsModalOpen(true);
  };

  // --- DELETE PRODUCT ---
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }

    try {
      await apiCall("deleteProduct", { id: productId });
      console.log(`Product ${productId} deleted successfully.`);
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert(`Error deleting product: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
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
        openingStock: initialStock,
        currentStock: editingProduct ? (editingProduct.currentStock ?? initialStock) : initialStock, 
        minStock: Number(formData.minStock) || 0,
        status: formData.status || "Active",
        updatedAt: new Date().toISOString()
      };

      console.log("Submitting payload to Firebase:", payload);

      if (editingProduct) {
        await apiCall("updateProduct", { ...payload, id: editingProduct.id });
      } else {
        await apiCall("addProduct", payload);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save product to Firebase:", error);
      alert(`Error saving product: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products Inventory</h1>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Product
        </button>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600 text-sm">
              <th className="p-4">NAME</th>
              <th className="p-4">CATEGORY</th>
              <th className="p-4">UNIT</th>
              <th className="p-4">COST PRICE</th>
              <th className="p-4">RETAIL PRICE</th>
              <th className="p-4">WHOLESALE</th>
              <th className="p-4">STOCK</th>
              <th className="p-4">STATUS</th>
              <th className="p-4 text-center">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  Loading products...
                </td>
              </tr>
            ) : products && products.length > 0 ? (
              products.map((product: any) => (
                <tr key={product.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-4 font-medium">{product.name}</td>
                  <td className="p-4">{product.category}</td>
                  <td className="p-4">{product.unit}</td>
                  <td className="p-4">₦{Number(product.buyingPrice || 0).toLocaleString()}</td>
                  <td className="p-4">₦{Number(product.sellingPrice || 0).toLocaleString()}</td>
                  <td className="p-4">₦{Number(product.wholesalePrice || 0).toLocaleString()}</td>
                  <td className="p-4 font-semibold text-blue-600">
                    {product.currentStock ?? product.openingStock ?? 0}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        product.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.status || "Active"}
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button
                      onClick={() => handleEditClick(product)}
                      className="px-3 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  No products found. Add your first product above!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Product Modal (Add / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h2>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Cooking Gas 12.5kg"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                {showNewCategoryInput ? (
                  <input
                    type="text"
                    placeholder="Enter new category"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full border p-2 rounded"
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
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Select Category</option>
                    <option value="General">General</option>
                    <option value="LPG">LPG</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Kerosene">Kerosene</option>
                    <option value="ADD_NEW">+ Add New Category</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Buying Price (₦)</label>
                  <input
                    type="number"
                    name="buyingPrice"
                    value={formData.buyingPrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price (₦)</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full border p-2 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Wholesale Price (₦)</label>
                  <input
                    type="number"
                    name="wholesalePrice"
                    value={formData.wholesalePrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                  >
                    <option value="KG">KG</option>
                    <option value="Litre">Litre</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Bag">Bag</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Opening Stock</label>
                  <input
                    type="number"
                    name="openingStock"
                    value={formData.openingStock}
                    onChange={handleInputChange}
                    placeholder="e.g. 50"
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleInputChange}
                    placeholder="e.g. 5"
                    className="w-full border p-2 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : editingProduct ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}