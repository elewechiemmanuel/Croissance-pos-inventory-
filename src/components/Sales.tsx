import React from "react";
import { useData } from "../context/DataContext";
import { formatCurrency } from "../lib/utils";

export default function SalesComponent() {
  const { products, loading } = useData();

  if (loading) return <div>Loading products and prices...</div>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Select Product & Pricing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((product: any) => (
          <div key={product.id || product._id} className="border p-4 rounded-xl shadow-xs bg-white">
            <h3 className="font-bold text-blue-950">{product.name}</h3>
            <p className="text-xs text-gray-500 mb-2">Unit: {product.unit} | Stock: {product.currentStock ?? product.openingStock}</p>
            
            <div className="flex gap-4 text-sm">
              <div>
                <span className="block text-xs text-gray-400">Retail Price</span>
                <span className="font-bold text-blue-900">{formatCurrency(Number(product.sellingPrice || 0))}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400">Wholesale Price</span>
                <span className="font-bold text-purple-900">{formatCurrency(Number(product.wholesalePrice || 0))}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}