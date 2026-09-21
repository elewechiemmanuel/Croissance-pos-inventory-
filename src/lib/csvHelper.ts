import { Product } from "../types";

export interface ParsedCsvProduct {
  id?: string;
  name: string;
  category: string;
  type: string;
  salesType: "Retail" | "Wholesale";
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  currentStock: number;
  openingStock: number;
  minStock: number;
  status: "Active" | "Inactive";
  // Diagnostic fields for UI preview
  rowNumber: number;
  isExisting?: boolean;
  matchedProductId?: string;
  diff?: {
    stockChange?: { old: number; new: number };
    priceChange?: { old: number; new: number };
  };
  warnings: string[];
  errors: string[];
}

/**
 * Splits CSV lines while respecting quoted fields that contain commas or quotes.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped double quote
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Push remainder field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes header string to canonical key
 */
function normalizeHeader(raw: string): string {
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.includes("productid") || clean === "id") return "id";
  if (clean.includes("productname") || clean === "product" || clean === "item" || clean === "itemname" || clean === "name" || clean === "description") return "name";
  if (clean.includes("category") || clean === "cat" || clean === "group" || clean === "department") return "category";
  if (clean === "type" || clean.includes("fueltype") || clean.includes("itemtype")) return "type";
  if (clean.includes("salestype") || clean.includes("salesmode") || clean === "mode" || clean.includes("channel")) return "salesType";
  if (clean === "unit" || clean.includes("unitofmeasure") || clean === "uom" || clean === "measure") return "unit";
  if (clean.includes("buyingprice") || clean.includes("costprice") || clean === "cost" || clean.includes("purchaseprice") || clean === "buyprice") return "buyingPrice";
  if (clean.includes("sellingprice") || clean.includes("retailprice") || clean === "price" || clean === "retail" || clean.includes("saleprice")) return "sellingPrice";
  if (clean.includes("wholesaleprice") || clean === "wholesale" || clean.includes("bulkprice") || clean === "trade") return "wholesalePrice";
  if (clean.includes("currentstock") || clean === "stock" || clean === "quantity" || clean === "qty" || clean.includes("balance") || clean.includes("inventory")) return "currentStock";
  if (clean.includes("openingstock") || clean === "opening") return "openingStock";
  if (clean.includes("minstock") || clean.includes("reorder") || clean.includes("alertlevel") || clean.includes("threshold") || clean === "alert") return "minStock";
  if (clean === "status" || clean.includes("active") || clean === "state") return "status";
  return clean;
}

/**
 * Parses inventory CSV string into structured preview products
 */
export function parseInventoryCsv(csvText: string, existingProducts: Product[] = []): {
  items: ParsedCsvProduct[];
  totalRows: number;
  validCount: number;
  errorCount: number;
  newCount: number;
  updateCount: number;
} {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) {
    return { items: [], totalRows: 0, validCount: 0, errorCount: 0, newCount: 0, updateCount: 0 };
  }

  const headerRow = rawRows[0];
  const headerMap: Record<number, string> = {};
  headerRow.forEach((h, idx) => {
    headerMap[idx] = normalizeHeader(h);
  });

  const items: ParsedCsvProduct[] = [];
  let validCount = 0;
  let errorCount = 0;
  let newCount = 0;
  let updateCount = 0;

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const rowObj: Record<string, string> = {};
    row.forEach((val, idx) => {
      const key = headerMap[idx];
      if (key) {
        rowObj[key] = val;
      }
    });

    const warnings: string[] = [];
    const errors: string[] = [];

    const rawName = rowObj["name"] || "";
    if (!rawName.trim()) {
      errors.push("Missing required Product Name.");
    }

    const name = rawName.trim();
    const id = rowObj["id"]?.trim();

    // Default category & unit heuristics based on fuel names
    let category = rowObj["category"]?.trim();
    if (!category) {
      if (name.toLowerCase().includes("petrol") || name.toLowerCase().includes("pms")) category = "Petrol";
      else if (name.toLowerCase().includes("diesel") || name.toLowerCase().includes("ago")) category = "Diesel";
      else if (name.toLowerCase().includes("lpg") || name.toLowerCase().includes("gas")) category = "LPG";
      else if (name.toLowerCase().includes("kerosene") || name.toLowerCase().includes("dpk")) category = "Kerosene";
      else if (name.toLowerCase().includes("oil") || name.toLowerCase().includes("lubricant") || name.toLowerCase().includes("atf")) category = "Lubricants";
      else category = "General";
      warnings.push(`Category inferred as "${category}".`);
    }

    let unit = rowObj["unit"]?.trim();
    if (!unit) {
      if (category === "Petrol" || category === "Diesel" || category === "Kerosene") unit = "Litre";
      else if (category === "LPG") unit = "KG";
      else unit = "Unit";
      warnings.push(`Unit inferred as "${unit}".`);
    }

    let salesType: "Retail" | "Wholesale" = "Retail";
    const rawSales = (rowObj["salesType"] || "").toLowerCase();
    if (rawSales.includes("whole") || rawSales.includes("bulk") || name.toLowerCase().includes("wholesale") || name.toLowerCase().includes("tanker")) {
      salesType = "Wholesale";
    }

    // Numbers
    const parseNumber = (val: string | undefined, defaultVal: number): number => {
      if (!val) return defaultVal;
      const cleanNum = val.replace(/[^0-9.-]+/g, "");
      const num = parseFloat(cleanNum);
      return isNaN(num) ? defaultVal : num;
    };

    const buyingPrice = Math.max(0, parseNumber(rowObj["buyingPrice"], 0));
    const sellingPrice = Math.max(0, parseNumber(rowObj["sellingPrice"], 0));
    let wholesalePrice = Math.max(0, parseNumber(rowObj["wholesalePrice"], 0));
    if (wholesalePrice === 0 && sellingPrice > 0) {
      wholesalePrice = salesType === "Wholesale" ? sellingPrice : Math.round(sellingPrice * 0.95);
    }

    const currentStock = parseNumber(rowObj["currentStock"], 0);
    const openingStock = parseNumber(rowObj["openingStock"], currentStock);
    const minStock = Math.max(0, parseNumber(rowObj["minStock"], 10));

    let status: "Active" | "Inactive" = "Active";
    const rawStatus = (rowObj["status"] || "").toLowerCase();
    if (rawStatus.includes("inact") || rawStatus.includes("disable") || rawStatus === "no" || rawStatus === "0") {
      status = "Inactive";
    }

    // Match with existing products
    const matched = existingProducts.find(p => 
      (id && p.id.toLowerCase() === id.toLowerCase()) || 
      p.name.trim().toLowerCase() === name.toLowerCase()
    );

    const isExisting = Boolean(matched);
    let diff: ParsedCsvProduct["diff"] = undefined;

    if (matched) {
      diff = {
        stockChange: { old: matched.currentStock, new: currentStock },
        priceChange: { old: matched.sellingPrice, new: sellingPrice }
      };
      updateCount++;
    } else {
      newCount++;
    }

    if (errors.length > 0) {
      errorCount++;
    } else {
      validCount++;
    }

    items.push({
      id: matched?.id || id,
      name,
      category,
      type: category,
      salesType,
      unit,
      buyingPrice,
      sellingPrice,
      wholesalePrice,
      currentStock,
      openingStock,
      minStock,
      status,
      rowNumber: r + 1,
      isExisting,
      matchedProductId: matched?.id,
      diff,
      warnings,
      errors
    });
  }

  return {
    items,
    totalRows: rawRows.length - 1,
    validCount,
    errorCount,
    newCount,
    updateCount
  };
}

/**
 * Generates sample inventory CSV template
 */
export function generateSampleInventoryCsv(): string {
  const headers = [
    "Product Name",
    "Category",
    "Sales Type",
    "Unit",
    "Buying Price",
    "Selling Price",
    "Wholesale Price",
    "Current Stock",
    "Min Stock",
    "Status"
  ];

  const sampleRows = [
    ["Petrol (PMS) - Dispenser Pump", "Petrol", "Retail", "Litre", "700", "760", "740", "15000", "1000", "Active"],
    ["Petrol (PMS) - Bulk Tanker (33,000L)", "Petrol", "Wholesale", "Litre", "680", "720", "710", "33000", "5000", "Active"],
    ["Diesel (AGO) - Pump Dispenser", "Diesel", "Retail", "Litre", "1100", "1350", "1300", "8500", "500", "Active"],
    ["Diesel (AGO) - Bulk Tanker", "Diesel", "Wholesale", "Litre", "1050", "1250", "1180", "45000", "2000", "Active"],
    ["Kerosene (DPK) - Pump / Retail", "Kerosene", "Retail", "Litre", "1150", "1400", "1350", "3200", "300", "Active"],
    ["LPG 50kg Refill / Cylinder", "LPG", "Wholesale", "KG", "42000", "52000", "49000", "25", "5", "Active"],
    ["LPG 12.5kg Refill / Cylinder", "LPG", "Retail", "KG", "10500", "13000", "12200", "60", "15", "Active"],
    ["LPG 6kg Refill / Cylinder", "LPG", "Retail", "KG", "5100", "6500", "6000", "40", "20", "Active"],
    ["Heavy Duty Engine Oil 15W-40 (4L)", "Lubricants", "Retail", "Unit", "14000", "18500", "17000", "35", "10", "Active"],
    ["Multi-Grade Engine Oil 20W-50 (4L)", "Lubricants", "Retail", "Unit", "12500", "16000", "15000", "42", "12", "Active"],
    ["Low Pressure Gas Regulator with Gauge", "Accessories", "Retail", "Unit", "4500", "6500", "5800", "50", "15", "Active"],
    ["Reinforced Gas Hose (2 Metres) + Clamps", "Accessories", "Retail", "Unit", "2200", "3500", "3000", "80", "25", "Active"]
  ];

  const escapeField = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const csvLines = [
    headers.map(escapeField).join(","),
    ...sampleRows.map(row => row.map(escapeField).join(","))
  ];

  return csvLines.join("\r\n");
}

/**
 * Exports current products array to CSV
 */
export function exportInventoryToCsv(products: Product[]): string {
  const headers = [
    "Product ID",
    "Product Name",
    "Category",
    "Type",
    "Sales Type",
    "Unit",
    "Buying Price",
    "Selling Price",
    "Wholesale Price",
    "Opening Stock",
    "Current Stock",
    "Min Stock",
    "Status"
  ];

  const escapeField = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const lines = [
    headers.map(escapeField).join(","),
    ...products.map(p => [
      p.id,
      p.name,
      p.category,
      p.type,
      p.salesType,
      p.unit,
      p.buyingPrice,
      p.sellingPrice,
      p.wholesalePrice,
      p.openingStock,
      p.currentStock,
      p.minStock,
      p.status
    ].map(escapeField).join(","))
  ];

  return lines.join("\r\n");
}

/**
 * Triggers standard browser file download for CSV content
 */
export function downloadCsvFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
