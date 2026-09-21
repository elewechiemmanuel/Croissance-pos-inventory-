// Google Sheets API Service for Croissance Oil and Gas Ltd
// Synchronizes all modules to Google Sheets (Products, Sales, Invoices, Waybills, Customers, Credit Ledger, Purchases, Users, Settings)

export interface LinkedSheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  lastSync?: string;
  ownerEmail?: string;
}

export interface SyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  syncedAt: string;
  modulesCount: number;
  details: {
    products: number;
    sales: number;
    invoices: number;
    waybills: number;
    customers: number;
    creditLedger: number;
    purchases: number;
    users: number;
    settings: number;
  };
}

const STORAGE_KEY = "croissance_linked_googlesheet";

export const DEFAULT_ADMIN_SHEET: LinkedSheetInfo = {
  spreadsheetId: "1-CroissanceOilAndGas-LiveDatabase-admincroissance",
  spreadsheetUrl: "https://docs.google.com/spreadsheets/u/0/create",
  title: "Croissance Oil & Gas Ltd - Station Database",
  ownerEmail: "admincroissance@gmail.com",
  lastSync: new Date().toISOString()
};

export const getStoredSheetInfo = (): LinkedSheetInfo | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_SHEET));
    return DEFAULT_ADMIN_SHEET;
  } catch (e) {
    return DEFAULT_ADMIN_SHEET;
  }
};

export const saveStoredSheetInfo = (info: LinkedSheetInfo | null) => {
  if (!info) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  }
};

export const ALL_SHEET_TABS = [
  "Products",
  "Sales",
  "Invoices",
  "Waybills",
  "Customers",
  "CreditLedger",
  "Purchases",
  "Users",
  "Settings"
];

/**
 * Ensures that all required sheet tabs exist in the target spreadsheet.
 * If any tab is missing, creates it with a frozen header row.
 */
async function ensureSheetsExist(accessToken: string, spreadsheetId: string): Promise<void> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { "Authorization": `Bearer ${accessToken}` }
      }
    );

    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const existingTitles = new Set((meta.sheets || []).map((s: any) => s.properties?.title));
    const missingSheets = ALL_SHEET_TABS.filter(t => !existingTitles.has(t));

    if (missingSheets.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            requests: missingSheets.map(title => ({
              addSheet: {
                properties: {
                  title,
                  gridProperties: { frozenRowCount: 1 }
                }
              }
            }))
          })
        }
      );
    }
  } catch (err) {
    console.warn("Could not auto-create missing sheets:", err);
  }
}

/**
 * Creates a brand-new, pre-structured Google Spreadsheet in Google Drive containing all 9 modules.
 */
export async function createSpreadsheetForApp(
  accessToken: string,
  appData: any
): Promise<LinkedSheetInfo> {
  const title = `Croissance Oil & Gas Ltd - Station Database (${new Date().toLocaleDateString('en-GB')})`;

  const payload = {
    properties: {
      title: title,
      locale: "en_GB",
      autoRecalc: "ON_CHANGE",
      timeZone: "Africa/Lagos"
    },
    sheets: ALL_SHEET_TABS.map(tab => ({
      properties: {
        title: tab,
        gridProperties: { frozenRowCount: 1 }
      }
    }))
  };

  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    throw new Error(errorData.error?.message || "Failed to create Google Spreadsheet.");
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // Now populate all tables with headers and current module records
  await syncDataToGoogleSheet(accessToken, spreadsheetId, appData);

  const linkedInfo: LinkedSheetInfo = {
    spreadsheetId,
    spreadsheetUrl,
    title,
    lastSync: new Date().toISOString()
  };

  saveStoredSheetInfo(linkedInfo);
  return linkedInfo;
}

/**
 * Syncs ALL application modules into the linked Google Sheet:
 * 1. Products & Inventory
 * 2. Sales & POS Transactions
 * 3. Invoices
 * 4. Waybills & Deliveries
 * 5. Customers
 * 6. Wholesale Credit Ledger
 * 7. Purchases & Stock Refills
 * 8. Staff & Users
 * 9. Station Settings & Profile
 */
export async function syncDataToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  appData: any
): Promise<SyncResult> {
  const { 
    products = [], 
    sales = [], 
    customers = [], 
    purchases = [], 
    users = [], 
    settings = {} 
  } = appData;

  // Ensure all 9 required sheet tabs exist
  await ensureSheetsExist(accessToken, spreadsheetId);

  // 1. PRODUCTS TAB (Inventory valuation, threshold status, prices)
  const productRows = [
    [
      "Product ID", 
      "Product Name", 
      "Category", 
      "Unit", 
      "Sales Mode", 
      "Buying Cost (₦)", 
      "Retail Price (₦)", 
      "Wholesale Price (₦)", 
      "Opening Stock", 
      "Current Stock", 
      "Reorder Alert Level", 
      "Stock Status", 
      "Inventory Valuation (₦)"
    ],
    ...products.map((p: any) => [
      p.id,
      p.name,
      p.category,
      p.unit,
      p.salesType || "Retail",
      p.buyingPrice || 0,
      p.sellingPrice || 0,
      p.wholesalePrice || 0,
      p.openingStock || 0,
      p.currentStock || 0,
      p.minStock || 0,
      p.status || (p.currentStock <= p.minStock ? "LOW STOCK" : "In Stock"),
      (p.currentStock || 0) * (p.buyingPrice || 0)
    ])
  ];

  // 2. SALES TAB (POS sales transactions, payments, attendant records)
  const saleRows = [
    [
      "Sale ID", 
      "Invoice Number", 
      "Date & Time", 
      "Customer Name", 
      "Customer Type", 
      "Attendant / Staff", 
      "Payment Method", 
      "Payment Status", 
      "Subtotal (₦)", 
      "Discount (₦)", 
      "Net Amount (₦)", 
      "Paid Amount (₦)", 
      "Balance (₦)", 
      "Items Breakdown"
    ],
    ...sales.map((s: any) => {
      const cust = customers.find((c: any) => c.id === s.customerId);
      return [
        s.id,
        s.invoiceNumber,
        s.date,
        s.customerName,
        cust?.type || "Retail",
        s.staffName || "Attendant",
        s.paymentMethod,
        s.paymentStatus || "Completed",
        s.subtotal || s.totalAmount,
        s.discount || 0,
        s.totalAmount,
        s.paidAmount || s.totalAmount,
        s.balance || 0,
        s.items 
          ? s.items.map((i: any) => `${i.productName} (${i.quantity} ${i.unit || 'units'} @ ₦${i.unitPrice || i.price}) = ₦${i.total}`).join(" | ") 
          : ""
      ];
    })
  ];

  // 3. INVOICES TAB (All formal sales invoices generated)
  const invoiceRows = [
    [
      "Invoice Number", 
      "Sale Reference", 
      "Issue Date", 
      "Customer Name", 
      "Business / Fleet Name", 
      "Customer Phone", 
      "Attendant", 
      "Subtotal (₦)", 
      "Discount (₦)", 
      "Total Amount (₦)", 
      "Payment Method", 
      "Payment Status", 
      "Waybill Reference", 
      "Line Items"
    ],
    ...sales.map((s: any) => {
      const cust = customers.find((c: any) => c.id === s.customerId);
      const waybillNum = s.waybillNumber || `WB-${s.invoiceNumber.replace("INV-", "")}`;
      return [
        s.invoiceNumber,
        s.id,
        s.date,
        s.customerName,
        s.businessName || cust?.businessName || "—",
        s.customerPhone || cust?.phone || "—",
        s.staffName || "Attendant",
        s.subtotal || s.totalAmount,
        s.discount || 0,
        s.totalAmount,
        s.paymentMethod,
        s.paymentStatus || "Completed",
        waybillNum,
        s.items 
          ? s.items.map((i: any) => `${i.productName} (${i.quantity} ${i.unit || 'units'})`).join(" ; ") 
          : ""
      ];
    })
  ];

  // 4. WAYBILLS & DELIVERIES TAB (Dispatch, haulage, transporter records)
  const waybillRows = [
    [
      "Waybill Number", 
      "Invoice Reference", 
      "Dispatch Date", 
      "Customer Name", 
      "Business / Fleet Name", 
      "Delivery Destination Address", 
      "Vehicle / Truck No", 
      "Driver Name", 
      "Driver Phone", 
      "Dispatch Station", 
      "Staff In Charge", 
      "Items Dispatched", 
      "Delivery Status", 
      "Special Delivery Notes"
    ],
    ...sales.map((s: any) => {
      const cust = customers.find((c: any) => c.id === s.customerId);
      const waybillNum = s.waybillNumber || `WB-${s.invoiceNumber.replace("INV-", "")}`;
      return [
        waybillNum,
        s.invoiceNumber,
        s.date,
        s.customerName,
        s.businessName || cust?.businessName || "—",
        s.deliveryAddress || s.customerAddress || cust?.address || settings.stationAddress || "Station Delivery Point",
        s.vehicleNumber || "STATION-DIRECT",
        s.driverName || "Station Logistics Driver",
        s.driverPhone || settings.phoneNumbers || "08131307891",
        settings.businessName || "Croissance Oil and Gas Ltd",
        s.staffName || "Logistics Officer",
        s.items 
          ? s.items.map((i: any) => `${i.productName}: ${i.quantity} ${i.unit || 'units'}`).join(" | ") 
          : "",
        "Dispatched / Delivered",
        s.deliveryNotes || "Goods inspected and certified in good condition."
      ];
    })
  ];

  // 5. CUSTOMERS TAB (All retail and wholesale customer accounts)
  const customerRows = [
    [
      "Customer ID", 
      "Full Name", 
      "Business Name", 
      "Phone", 
      "Email", 
      "Delivery Address", 
      "Customer Type", 
      "Credit Limit (₦)", 
      "Outstanding Balance (₦)", 
      "Available Credit (₦)", 
      "Cumulative Purchases (₦)"
    ],
    ...customers.map((c: any) => [
      c.id,
      c.fullName || c.name || "",
      c.businessName || "",
      c.phone || "",
      c.email || "",
      c.address || "",
      c.type || "Retail",
      c.creditLimit || 0,
      c.outstandingBalance || c.balance || 0,
      Math.max(0, (c.creditLimit || 0) - (c.outstandingBalance || c.balance || 0)),
      c.totalPurchases || 0
    ])
  ];

  // 6. WHOLESALE CREDIT LEDGER TAB (Dedicated debt, limits, and settlement risk tracking)
  const wholesaleCustomers = customers.filter((c: any) => c.type === "Wholesale");
  const creditLedgerRows = [
    [
      "Customer ID", 
      "Customer Name", 
      "Business / Fleet Company", 
      "Phone", 
      "Delivery Address", 
      "Authorized Credit Limit (₦)", 
      "Current Balance Owed (₦)", 
      "Net Available Credit (₦)", 
      "Account Credit Status", 
      "Total Cumulative Volume (₦)"
    ],
    ...wholesaleCustomers.map((c: any) => {
      const limit = Number(c.creditLimit || 0);
      const balance = Number(c.outstandingBalance || 0);
      const available = limit - balance;
      let status = "CLEARED / GOOD STANDING";
      if (balance > limit && limit > 0) {
        status = "OVER AUTHORIZED LIMIT";
      } else if (balance > 0) {
        status = "ACTIVE DEBT PENDING";
      }
      return [
        c.id,
        c.fullName,
        c.businessName || "—",
        c.phone || "—",
        c.address || "—",
        limit,
        balance,
        available,
        status,
        c.totalPurchases || 0
      ];
    })
  ];

  // 7. PURCHASES TAB (Station refueling and bulk product intake)
  const purchaseRows = [
    [
      "Purchase ID", 
      "Date", 
      "Supplier Name", 
      "Product Name", 
      "Quantity Received", 
      "Unit Cost (₦)", 
      "Total Cost (₦)", 
      "Recorded By Officer"
    ],
    ...purchases.map((pu: any) => [
      pu.id,
      pu.date,
      pu.supplierName || pu.supplier || "Petroleum Depot / Supplier",
      pu.productName,
      pu.quantity,
      pu.unitCost,
      pu.totalCost,
      pu.recordedBy || "Station Admin"
    ])
  ];

  // 8. USERS & STAFF TAB (Attendants, cashiers, supervisors, admins)
  const userRows = [
    [
      "Staff ID", 
      "Full Name", 
      "Email Login", 
      "System Access Role", 
      "Account Status"
    ],
    ...users.map((u: any) => [
      u.id,
      u.fullName,
      u.email,
      (u.role || "user").toUpperCase(),
      u.status || "Active"
    ])
  ];

  // 9. SETTINGS & STATION PROFILE TAB
  const settingRows = [
    ["Parameter Name", "System Value", "Description"],
    ["Business / Company Name", settings.businessName || "Croissance Oil and Gas Ltd", "Registered petroleum distribution entity"],
    ["CAC RC Number", settings.rcNumber || "1292088", "Corporate Affairs Commission registration"],
    ["Station Filling Address", settings.stationAddress || "Abule Pan Bus Stop, Ibeju Lekki, OPC Junction, Lagos, Nigeria.", "Pump and operational station premises"],
    ["Head Office Address", settings.officeAddress || "Block A3-500, HFP Eastline Shopping Complex, Ajah, Lagos, Nigeria.", "Executive corporate office"],
    ["Contact Phone Lines", settings.phoneNumbers || "08131307891, 08164782722", "Customer service and depot logistics lines"],
    ["Total Synced Modules", "9 Modules", "Products, Sales, Invoices, Waybills, Customers, Credit Ledger, Purchases, Users, Settings"],
    ["Last Synchronized Timestamp", new Date().toLocaleString("en-GB"), "Real-time sync timestamp from Croissance POS"]
  ];

  // Prepare batch value payload
  const valueRanges = [
    { range: "Products!A1", values: productRows },
    { range: "Sales!A1", values: saleRows },
    { range: "Invoices!A1", values: invoiceRows },
    { range: "Waybills!A1", values: waybillRows },
    { range: "Customers!A1", values: customerRows },
    { range: "CreditLedger!A1", values: creditLedgerRows },
    { range: "Purchases!A1", values: purchaseRows },
    { range: "Users!A1", values: userRows },
    { range: "Settings!A1", values: settingRows }
  ];

  // Execute batch update to Google Sheets
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: valueRanges
      })
    }
  );

  if (!updateRes.ok) {
    const errorData = await updateRes.json();
    throw new Error(errorData.error?.message || "Failed to update Google Sheet values.");
  }

  // Update last sync time in local storage
  const current = getStoredSheetInfo();
  const nowIso = new Date().toISOString();
  if (current && current.spreadsheetId === spreadsheetId) {
    current.lastSync = nowIso;
    saveStoredSheetInfo(current);
  }

  return {
    spreadsheetId,
    spreadsheetUrl: current?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    syncedAt: nowIso,
    modulesCount: 9,
    details: {
      products: products.length,
      sales: sales.length,
      invoices: sales.length,
      waybills: sales.length,
      customers: customers.length,
      creditLedger: wholesaleCustomers.length,
      purchases: purchases.length,
      users: users.length,
      settings: 7
    }
  };
}

/**
 * Reads data back from the linked Google Sheet into the application.
 */
export async function loadDataFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
) {
  const ranges = [
    "Products!A1:M",
    "Sales!A1:N",
    "Customers!A1:K",
    "Purchases!A1:H",
    "Users!A1:E",
    "Settings!A1:C"
  ];

  const query = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${query}`,
    {
      headers: { "Authorization": `Bearer ${accessToken}` }
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || "Failed to fetch data from Google Sheet.");
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  // Parse Products
  const prodValues = valueRanges[0]?.values || [];
  const products = [];
  for (let i = 1; i < prodValues.length; i++) {
    const row = prodValues[i];
    if (!row[0]) continue;
    products.push({
      id: row[0],
      name: row[1] || "",
      category: row[2] || "LPG",
      unit: row[3] || "KG",
      salesType: row[4] || "Retail",
      buyingPrice: Number(row[5] || 0),
      sellingPrice: Number(row[6] || 0),
      wholesalePrice: Number(row[7] || 0),
      openingStock: Number(row[8] || 0),
      currentStock: Number(row[9] || 0),
      minStock: Number(row[10] || 0),
      status: row[11] || "Active"
    });
  }

  // Parse Customers
  const custValues = valueRanges[2]?.values || [];
  const customers = [];
  for (let i = 1; i < custValues.length; i++) {
    const row = custValues[i];
    if (!row[0]) continue;
    customers.push({
      id: row[0],
      fullName: row[1] || "",
      businessName: row[2] || "",
      phone: row[3] || "",
      email: row[4] || "",
      address: row[5] || "",
      type: row[6] || "Retail",
      creditLimit: Number(row[7] || 0),
      outstandingBalance: Number(row[8] || 0),
      totalPurchases: Number(row[10] || 0)
    });
  }

  return {
    products,
    customers,
    rawValues: data
  };
}

/**
 * Validates access and retrieves metadata for a specified Google Spreadsheet ID.
 */
export async function fetchSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
    {
      headers: { "Authorization": `Bearer ${accessToken}` }
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || "Unable to access the specified Google Sheet. Please verify permissions.");
  }

  const data = await res.json();
  return {
    title: data.properties?.title || "Untitled Spreadsheet",
    sheets: data.sheets?.map((s: any) => s.properties?.title) || []
  };
}
