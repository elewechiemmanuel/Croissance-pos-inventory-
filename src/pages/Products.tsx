import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../store/AuthContext";
import { apiCall } from "../lib/api";
import { Edit2, Trash2, Plus, Package } from "lucide-react";
import { formatCurrency } from "../lib/utils";

type ProductType = "LPG Cooking Gas" | "Diesel (AGO)";

interface ProductFormData {
  name: ProductType;
  sku: string;
  unit: "KG" | "LTR";
  buyingPrice: string;
  sellingPrice: string;
  wholesalePrice: string;
  openingStock: string;
  minStock: string;
  status: string;
}

const PRODUCT_OPTIONS: {
  name: ProductType;
  sku: string;
  unit: "KG" | "LTR";
}[] = [
  {
    name: "LPG Cooking Gas",
    sku: "LPG",
    unit: "KG",
  },
  {
    name: "Diesel (AGO)",
    sku: "AGO",
    unit: "LTR",
  },
];

export default function Products() {
  const { products, loading } = useData();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "LPG Cooking Gas",
    sku: "LPG",
    unit: "KG",
    buyingPrice: "",
    sellingPrice: "",
    wholesalePrice: "",
    openingStock: "",
    minStock: "",
    status: "Active",
  });

  const resetForm = () => {
    setFormData({
      name: "LPG Cooking Gas",
      sku: "LPG",
      unit: "KG",
      buyingPrice: "",
      sellingPrice: "",
      wholesalePrice: "",
      openingStock: "",
      minStock: "",
      status: "Active",
    });

    setEditingProduct(null);
  };

  const handleProductChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedName = e.target.value as ProductType;

    const selectedProduct = PRODUCT_OPTIONS.find(
      (product) => product.name === selectedName
    );

    if (!selectedProduct) return;

    setFormData((prev) => ({
      ...prev,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      unit: selectedProduct.unit,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditClick = (product: any) => {
    if (!isAdmin) {
      alert("Access Denied: Only administrators can edit products.");
      return;
    }

    const productName =
      product.name === "Diesel" ||
      product.name === "Diesel AGO" ||
      product.name === "AGO"
        ? "Diesel (AGO)"
        : "LPG Cooking Gas";

    const selectedProduct = PRODUCT_OPTIONS.find(
      (item) => item.name === productName
    );

    setEditingProduct(product);

    setFormData({
      name: productName,
      sku: selectedProduct?.sku || product.sku || "",
      unit: selectedProduct?.unit || product.unit || "KG",
      buyingPrice: product.buyingPrice?.toString() || "",
      sellingPrice: product.sellingPrice?.toString() || "",
      wholesalePrice: product.wholesalePrice?.toString() || "",
      openingStock:
        (product.openingStock ?? product.currentStock)?.toString() || "",
      minStock: product.minStock?.toString() || "",
      status: product.status || "Active",
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

    if (
      !window.confirm(
        `Are you sure you want to delete "${product.name}"?`
      )
    ) {
      return;
    }

    try {
      await apiCall("deleteProduct", {
        id: productId,
      });

      window.location.reload();
    } catch (error) {
      console.error("Failed to delete product:", error);

      alert(
        `Error deleting product: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      alert(
        "Access Denied: Only administrators can save or modify products."
      );
      return;
    }

    setIsLoading(true);

    try {
      const initialStock = Number(formData.openingStock) || 0;
      const productId =
        editingProduct?.id || editingProduct?._id;

      const selectedProduct = PRODUCT_OPTIONS.find(
        (product) => product.name === formData.name
      );

      if (!selectedProduct) {
        throw new Error("Invalid product selected.");
      }

      const payload = {
        ...(productId ? { id: productId } : {}),

        name: selectedProduct.name,
        sku: selectedProduct.sku,
        category:
          selectedProduct.name === "LPG Cooking Gas"
            ? "LPG"
            : "Diesel",

        unit: selectedProduct.unit,

        // Prices (Retail & Wholesale updates enabled)
        buyingPrice: Number(formData.buyingPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        wholesalePrice:
          Number(formData.wholesalePrice) || 0,

        // Stock
        openingStock: initialStock,

        currentStock: editingProduct
          ? (editingProduct.currentStock ?? initialStock)
          : initialStock,

        minStock: Number(formData.minStock) || 0,

        status: formData.status || "Active",

        updatedAt: new Date().toISOString(),
      };

      if (editingProduct) {
        if (!productId) {
          throw new Error("Editing product ID is missing.");
        }

        await apiCall("updateProduct", payload);
      } else {
        await apiCall("addProduct", payload);
      }

      setIsModalOpen(false);
      resetForm();

      window.location.reload();
    } catch (error) {
      console.error("Failed to save product:", error);

      alert(
        `Error saving product: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* PAGE HEADER */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-2xs border border-gray-100">

        <div>
          <h1 className="text-2xl font-bold text-blue-950">
            Products & Pricing
          </h1>

          <p className="text-xs text-gray-500 mt-1">
            Manage LPG Cooking Gas and Diesel (AGO) retail and wholesale prices
          </p>
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

            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* PRODUCT TABLE */}
      <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse whitespace-nowrap">

            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-gray-600 text-xs font-bold uppercase tracking-wider">

                <th className="px-5 py-3.5">
                  Product
                </th>

                <th className="px-4 py-3.5">
                  Unit
                </th>

                <th className="px-4 py-3.5">
                  Cost Price
                </th>

                <th className="px-4 py-3.5">
                  Retail Price
                </th>

                <th className="px-4 py-3.5">
                  Wholesale Price
                </th>

                <th className="px-4 py-3.5">
                  Stock
                </th>

                <th className="px-4 py-3.5">
                  Status
                </th>

                {isAdmin && (
                  <th className="px-5 py-3.5 text-right">
                    Actions
                  </th>
                )}

              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-sm">

              {loading ? (

                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="p-12 text-center text-gray-400"
                  >
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />

                    <p className="text-xs">
                      Loading products...
                    </p>
                  </td>
                </tr>

              ) : products && products.length > 0 ? (

                products
                  .filter(
                    (product: any) =>
                      product.name === "LPG Cooking Gas" ||
                      product.name === "Diesel (AGO)" ||
                      product.name === "Diesel" ||
                      product.name === "Diesel AGO" ||
                      product.name === "AGO"
                  )
                  .map((product: any) => (

                    <tr
                      key={product.id || product._id}
                      className="hover:bg-blue-50/20 transition-colors"
                    >

                      {/* PRODUCT */}
                      <td className="px-5 py-3.5">

                        <div className="font-bold text-gray-900">
                          {product.name === "Diesel" ||
                          product.name === "Diesel AGO" ||
                          product.name === "AGO"
                            ? "Diesel (AGO)"
                            : "LPG Cooking Gas"}
                        </div>

                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {product.sku}
                        </div>

                      </td>

                      {/* UNIT */}
                      <td className="px-4 py-3.5 text-xs text-gray-600 font-medium">
                        {product.unit ||
                          (product.name === "LPG Cooking Gas"
                            ? "KG"
                            : "LTR")}
                      </td>

                      {/* COST */}
                      <td className="px-4 py-3.5 text-gray-800">
                        {formatCurrency(
                          Number(product.buyingPrice || 0)
                        )}
                      </td>

                      {/* RETAIL */}
                      <td className="px-4 py-3.5 font-bold text-blue-950">
                        {formatCurrency(
                          Number(product.sellingPrice || 0)
                        )}
                      </td>

                      {/* WHOLESALE */}
                      <td className="px-4 py-3.5 font-bold text-purple-900">
                        {formatCurrency(
                          Number(product.wholesalePrice || 0)
                        )}
                      </td>

                      {/* STOCK */}
                      <td className="px-4 py-3.5 font-bold text-blue-600">
                        {product.currentStock ??
                          product.openingStock ??
                          0}
                      </td>

                      {/* STATUS */}
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

                      {/* ACTIONS */}
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">

                          <div className="flex items-center justify-end gap-1.5">

                            <button
                              onClick={() =>
                                handleEditClick(product)
                              }
                              className="p-1.5 text-gray-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit product and prices"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() =>
                                handleDeleteProduct(product)
                              }
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>

                        </td>
                      )}

                    </tr>

                  ))

              ) : (

                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="p-12 text-center text-gray-400"
                  >
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />

                    <p className="font-semibold text-sm text-gray-600">
                      No products found
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Add LPG Cooking Gas or Diesel (AGO) to your inventory.
                    </p>
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (

        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">

          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* MODAL HEADER */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-blue-950 text-white">

              <div>
                <h3 className="font-bold text-base">
                  {editingProduct
                    ? "Edit Product & Prices"
                    : "Add Product"}
                </h3>

                <p className="text-[11px] text-blue-200 mt-1">
                  Only LPG Cooking Gas and Diesel (AGO) are supported.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-blue-200 hover:text-white cursor-pointer text-lg"
              >
                ✕
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={handleSaveProduct}
              className="p-6 overflow-y-auto space-y-5"
            >

              {/* PRODUCT */}
              <div>

                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Product *
                </label>

                <select
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleProductChange}
                  disabled={!!editingProduct}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 font-semibold disabled:bg-gray-100 disabled:text-gray-500"
                >

                  <option value="LPG Cooking Gas">
                    LPG Cooking Gas
                  </option>

                  <option value="Diesel (AGO)">
                    Diesel (AGO)
                  </option>

                </select>

              </div>

              {/* UNIT / SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Unit
                  </label>

                  <input
                    type="text"
                    value={formData.unit}
                    readOnly
                    className="w-full px-3 py-2.5 text-sm bg-gray-100 border border-gray-300 rounded-lg font-semibold text-gray-600"
                  />

                </div>

                <div>

                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    SKU
                  </label>

                  <input
                    type="text"
                    value={formData.sku}
                    readOnly
                    className="w-full px-3 py-2.5 text-sm bg-gray-100 border border-gray-300 rounded-lg font-semibold text-gray-600"
                  />

                </div>

              </div>

              {/* PRICES */}
              <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4">

                <h4 className="text-sm font-bold text-blue-950 mb-3">
                  Product Pricing
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {/* COST */}
                  <div>

                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Cost Price (₦)
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="buyingPrice"
                      value={formData.buyingPrice}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                    />

                  </div>

                  {/* RETAIL */}
                  <div>

                    <label className="block text-xs font-semibold text-blue-900 mb-1">
                      Retail Price (₦) *
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      name="sellingPrice"
                      value={formData.sellingPrice}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 font-bold text-blue-900"
                    />

                  </div>

                  {/* WHOLESALE */}
                  <div>

                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Wholesale Price (₦) *
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      name="wholesalePrice"
                      value={formData.wholesalePrice}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-purple-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 font-bold text-purple-900"
                    />

                  </div>

                </div>

              </div>

              {/* STOCK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Opening Stock *
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="openingStock"
                    required
                    value={formData.openingStock}
                    onChange={handleInputChange}
                    disabled={!!editingProduct}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 font-bold disabled:bg-gray-100"
                  />

                  {editingProduct && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Existing stock is not changed when editing prices.
                    </p>
                  )}

                </div>

                <div>

                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Minimum Stock Alert
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                  />

                </div>

              </div>

              {/* STATUS */}
              <div>

                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                >

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>

                </select>

              </div>

              {/* BUTTONS */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isLoading
                    ? "Saving..."
                    : editingProduct
                    ? "Update Product"
                    : "Save Product"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}