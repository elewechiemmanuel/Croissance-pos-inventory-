import { Product } from "../types";

export interface ParsedCsvProduct {
  rowNumber: number;
  id?: string;
  name: string;
  category: string;
  type: string;
  salesType: string;
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  currentStock: number;
  openingStock: number;
  minStock: number;
  status: string;
  isExisting: boolean;
  errors: string[];
  warnings: string[];
  diff?: {
    stockChange?: { old: number; new: number };
  };
}

/**
 * Your existing export function
 */
export function exportToCSV(filename: string, rows: object[]) {
  if (!rows || !rows.length) {
    alert("No data available to export.");
    return;
  }

  const separator = ",";
  const keys = Object.keys(rows[0]);
  
  const csvContent = [
    keys.join(separator),
    ...rows.map(row => {
      return keys.map(k => {
        let cell = (row as Record<string, any>)[k];
        if (cell === null || cell === undefined) {
          cell = "";
        } else {
          cell = cell.toString().replace(/"/g, '""');
        }
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    })
  ].join("\n");

  downloadCsvFile(csvContent, filename);
}

/**
 * Downloads a raw string content as a CSV file download
 */
export function downloadCsvFile(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Generates a template CSV string for inventory import
 */
export function generateSampleInventoryCsv(): string {
  const headers = [
    "name",
    "category",
    "type",
    "salesType",
    "unit",
    "buyingPrice",
    "sellingPrice",
    "wholesalePrice",
    "currentStock",
    "openingStock",
    "minStock",
    "status"
  ];

  const sampleRows = [
    "Premium Motor Spirit (PMS),Fuel,Liquid,Retail,Litre,800,850,830,45000,50000,5000,Active",
    "Automotive Gas Oil (AGO),Fuel,Liquid,Retail,Litre,1150,1250,1200,20000,25000,2000,Active",
    "Dual Purpose Kerosene (DPK),Fuel,Liquid,Retail,Litre,950,1020,990,10000,12000,1500,Active",
    "Cooking Gas (LPG 12.5kg),Gas,Cylinder,Retail,Unit,14000,16000,15500,150,200,20,Active"
  ];

  return [headers.join(","), ...sampleRows].join("\n");
}

/**
 * Exports all current products into a formatted CSV string
 */
export function exportInventoryToCsv(products: Product[]): string {
  const headers = [
    "id",
    "name",
    "category",
    "type",
    "salesType",
    "unit",
    "buyingPrice",
    "sellingPrice",
    "wholesalePrice",
    "currentStock",
    "openingStock",
    "minStock",
    "status"
  ];

  const rows = products.map(p => [
    p.id || "",
    `"${(p.name || "").replace(/"/g, '""')}"`,
    `"${(p.category || "").replace(/"/g, '""')}"`,
    p.type || "Liquid",
    p.salesType || "Retail",
    p.unit || "Litre",
    p.buyingPrice || 0,
    p.sellingPrice || 0,
    p.wholesalePrice || 0,
    p.currentStock || 0,
    p.openingStock || 0,
    p.minStock || 0,
    p.status || "Active"
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

/**
 * Parses raw CSV text and maps it against existing products to detect new vs update rows
 */
export function parseInventoryCsv(csvText: string, existingProducts: Product[]): {
  items: ParsedCsvProduct[];
  totalRows: number;
  validCount: number;
  errorCount: number;
  newCount: number;
  updateCount: number;
} {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("The CSV file is empty.");
  }

  // Simple CSV parser handling quotes
  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(val => val.replace(/^"|"$/g, "").replace(/""/g, '"'));
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase());
  
  const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("product"));
  const categoryIdx = headers.findIndex(h => h.includes("category"));
  const typeIdx = headers.findIndex(h => h.includes("type"));
  const salesTypeIdx = headers.findIndex(h => h.includes("salestype") || h.includes("sales"));
  const unitIdx = headers.findIndex(h => h.includes("unit"));
  const buyPriceIdx = headers.findIndex(h => h.includes("buying") || h.includes("cost") || h.includes("buy"));
  const sellPriceIdx = headers.findIndex(h => h.includes("selling") || h.includes("price") || h.includes("retail"));
  const wholesaleIdx = headers.findIndex(h => h.includes("wholesale"));
  const stockIdx = headers.findIndex(h => h.includes("currentstock") || h.includes("stock") || h.includes("quantity"));
  const openingIdx = headers.findIndex(h => h.includes("opening"));
  const minStockIdx = headers.findIndex(h => h.includes("min"));
  const statusIdx = headers.findIndex(h => h.includes("status"));

  if (nameIdx === -1) {
    throw new Error("CSV must contain a product 'name' column.");
  }

  const items: ParsedCsvProduct[] = [];
  let validCount = 0;
  let errorCount = 0;
  let newCount = 0;
  let updateCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length === 0 || cols.every(c => c === "")) continue;

    const name = cols[nameIdx] || "";
    const category = categoryIdx !== -1 ? cols[categoryIdx] || "General" : "General";
    const type = typeIdx !== -1 ? cols[typeIdx] || "Liquid" : "Liquid";
    const salesType = salesTypeIdx !== -1 ? cols[salesTypeIdx] || "Retail" : "Retail";
    const unit = unitIdx !== -1 ? cols[unitIdx] || "Litre" : "Litre";
    
    const buyingPrice = buyPriceIdx !== -1 ? parseFloat(cols[buyPriceIdx]) || 0 : 0;
    const sellingPrice = sellPriceIdx !== -1 ? parseFloat(cols[sellPriceIdx]) || 0 : 0;
    const wholesalePrice = wholesaleIdx !== -1 ? parseFloat(cols[wholesaleIdx]) || 0 : sellingPrice;
    const currentStock = stockIdx !== -1 ? parseFloat(cols[stockIdx]) || 0 : 0;
    const openingStock = openingIdx !== -1 ? parseFloat(cols[openingIdx]) || 0 : currentStock;
    const minStock = minStockIdx !== -1 ? parseFloat(cols[minStockIdx]) || 0 : 10;
    const status = statusIdx !== -1 ? cols[statusIdx] || "Active" : "Active";

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!name) errors.push("Missing product name");
    if (sellingPrice <= 0) warnings.push("Selling price is 0 or negative");

    // Check if product exists in existing database
    const matchedExisting = existingProducts.find(
      p => p.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

    const isExisting = !!matchedExisting;
    if (isExisting) {
      updateCount++;
    } else {
      newCount++;
    }

    if (errors.length === 0) {
      validCount++;
    } else {
      errorCount++;
    }

    const diff = isExisting ? {
      stockChange: {
        old: matchedExisting.currentStock || 0,
        new: currentStock
      }
    } : undefined;

    items.push({
      rowNumber: i + 1,
      id: matchedExisting?.id,
      name,
      category,
      type,
      salesType,
      unit,
      buyingPrice,
      sellingPrice,
      wholesalePrice,
      currentStock,
      openingStock,
      minStock,
      status,
      isExisting,
      errors,
      warnings,
      diff
    });
  }

  return {
    items,
    totalRows: items.length,
    validCount,
    errorCount,
    newCount,
    updateCount
  };
}