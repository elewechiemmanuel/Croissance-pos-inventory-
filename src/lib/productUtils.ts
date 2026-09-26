// src/lib/productUtils.ts
export function getProductPrices(products: any[]) {
  if (!products) return [];
  
  return products
    .filter((product: any) => 
      ["LPG Cooking Gas", "Diesel (AGO)", "Diesel", "Diesel AGO", "AGO"].includes(product.name)
    )
    .map((product: any) => ({
      id: product.id || product._id,
      name: product.name === "Diesel" || product.name === "AGO" ? "Diesel (AGO)" : product.name,
      sku: product.sku,
      unit: product.unit,
      costPrice: Number(product.buyingPrice || 0),
      retailPrice: Number(product.sellingPrice || 0),
      wholesalePrice: Number(product.wholesalePrice || 0),
      stock: product.currentStock ?? product.openingStock ?? 0,
      status: product.status || "Active",
    }));
}