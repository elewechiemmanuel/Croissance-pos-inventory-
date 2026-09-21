/**
 * CROISSANCE OIL AND GAS LTD - GOOGLE APPS SCRIPT BACKEND
 * 
 * INSTRUCTIONS:
 * 1. Go to Google Drive -> New -> Google Sheets. Name it "Croissance Database".
 * 2. Create or verify the following worksheets (tabs) exactly as named:
 *    - Products
 *    - Sales
 *    - Invoices
 *    - Waybills
 *    - Customers
 *    - CreditLedger
 *    - Purchases
 *    - Users
 *    - Settings
 * 3. Go to Extensions -> Apps Script.
 * 4. Paste this entire code into Code.gs, replacing the default code.
 * 5. Click Save.
 * 6. Click Deploy -> New Deployment.
 * 7. Select type: "Web App".
 * 8. Execute as: "Me".
 * 9. Who has access: "Anyone".
 * 10. Click Deploy. Authorize the permissions.
 * 11. Copy the "Web app URL" and paste it into the .env.example file as GOOGLE_SHEETS_WEB_APP_URL in this app.
 */

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload;
    
    let result = null;
    
    switch (action) {
      case 'getInitialData':
        result = getInitialData();
        break;
      case 'addSale':
        result = addSale(payload);
        break;
      case 'addProduct':
        result = addProduct(payload);
        break;
      case 'batchImportProducts':
        result = batchImportProducts(payload);
        break;
      case 'updateProduct':
        result = updateProduct(payload);
        break;
      case 'deleteProduct':
        result = deleteProduct(payload);
        break;
      case 'addUser':
        result = addUser(payload);
        break;
      case 'updateUser':
        result = updateUser(payload);
        break;
      case 'deleteUser':
        result = deleteUser(payload);
        break;
      case 'updateSettings':
        result = updateSettings(payload);
        break;
      default:
        throw new Error("Action not supported in GAS yet. Use the local fallback.");
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getInitialData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const getSheetData = (sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data[0];
    return data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
  };
  
  return {
    products: getSheetData("Products"),
    customers: getSheetData("Customers"),
    sales: getSheetData("Sales"),
    users: getSheetData("Users")
  };
}

function addSale(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = ss.getSheetByName("Sales");
  
  // Basic example of appending a row. 
  // You would expand this to handle full nested data mapping.
  salesSheet.appendRow([
    payload.id,
    payload.invoiceNumber,
    new Date(),
    payload.customerId,
    payload.totalAmount,
    payload.paymentMethod
  ]);
  
  return payload;
}

function addProduct(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prodSheet = ss.getSheetByName("Products");
  const newId = payload.id || `P${Date.now()}`;
  prodSheet.appendRow([
    newId,
    payload.name,
    payload.category,
    payload.type,
    payload.salesType,
    payload.unit,
    payload.buyingPrice,
    payload.sellingPrice,
    payload.wholesalePrice,
    payload.openingStock,
    payload.currentStock || payload.openingStock,
    payload.minStock,
    payload.status || "Active"
  ]);
  return { ...payload, id: newId, currentStock: payload.currentStock || payload.openingStock };
}

function batchImportProducts(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prodSheet = ss.getSheetByName("Products");
  if (!prodSheet) throw new Error("Products sheet tab not found.");

  const items = payload.items || [];
  const mode = payload.mode || "upsert";
  const data = prodSheet.getDataRange().getValues();
  let addedCount = 0;
  let updatedCount = 0;

  for (let k = 0; k < items.length; k++) {
    const item = items[k];
    if (!item.name) continue;

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if ((item.id && String(data[i][0]) === String(item.id)) || 
          String(data[i][1]).trim().toLowerCase() === String(item.name).trim().toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex !== -1) {
      if (mode === "addOnly") continue;
      if (mode === "stockOnly") {
        if (item.currentStock !== undefined) prodSheet.getRange(rowIndex, 11).setValue(item.currentStock);
      } else {
        if (item.name !== undefined) prodSheet.getRange(rowIndex, 2).setValue(item.name);
        if (item.category !== undefined) prodSheet.getRange(rowIndex, 3).setValue(item.category);
        if (item.salesType !== undefined) prodSheet.getRange(rowIndex, 5).setValue(item.salesType);
        if (item.unit !== undefined) prodSheet.getRange(rowIndex, 6).setValue(item.unit);
        if (item.buyingPrice !== undefined) prodSheet.getRange(rowIndex, 7).setValue(item.buyingPrice);
        if (item.sellingPrice !== undefined) prodSheet.getRange(rowIndex, 8).setValue(item.sellingPrice);
        if (item.wholesalePrice !== undefined) prodSheet.getRange(rowIndex, 9).setValue(item.wholesalePrice);
        if (item.currentStock !== undefined) prodSheet.getRange(rowIndex, 11).setValue(item.currentStock);
        if (item.minStock !== undefined) prodSheet.getRange(rowIndex, 12).setValue(item.minStock);
        if (item.status !== undefined) prodSheet.getRange(rowIndex, 13).setValue(item.status);
      }
      updatedCount++;
    } else {
      if (mode === "stockOnly") continue;
      const newId = item.id || `P${Date.now() + k}`;
      prodSheet.appendRow([
        newId,
        item.name,
        item.category || "General",
        item.type || item.category || "General",
        item.salesType || "Retail",
        item.unit || "Unit",
        item.buyingPrice || 0,
        item.sellingPrice || 0,
        item.wholesalePrice || 0,
        item.openingStock !== undefined ? item.openingStock : (item.currentStock || 0),
        item.currentStock !== undefined ? item.currentStock : (item.openingStock || 0),
        item.minStock || 10,
        item.status || "Active"
      ]);
      addedCount++;
    }
  }

  return { addedCount: addedCount, updatedCount: updatedCount, success: true };
}

function updateProduct(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prodSheet = ss.getSheetByName("Products");
  const data = prodSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == payload.id) {
      if (payload.name !== undefined) prodSheet.getRange(i + 1, 2).setValue(payload.name);
      if (payload.category !== undefined) prodSheet.getRange(i + 1, 3).setValue(payload.category);
      if (payload.buyingPrice !== undefined) prodSheet.getRange(i + 1, 7).setValue(payload.buyingPrice);
      if (payload.sellingPrice !== undefined) prodSheet.getRange(i + 1, 8).setValue(payload.sellingPrice);
      if (payload.wholesalePrice !== undefined) prodSheet.getRange(i + 1, 9).setValue(payload.wholesalePrice);
      if (payload.currentStock !== undefined) prodSheet.getRange(i + 1, 11).setValue(payload.currentStock);
      if (payload.minStock !== undefined) prodSheet.getRange(i + 1, 12).setValue(payload.minStock);
      if (payload.status !== undefined) prodSheet.getRange(i + 1, 13).setValue(payload.status);
      return payload;
    }
  }
  throw new Error("Product ID not found: " + payload.id);
}

function deleteProduct(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prodSheet = ss.getSheetByName("Products");
  const data = prodSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == payload.id) {
      prodSheet.deleteRow(i + 1);
      return { success: true, id: payload.id };
    }
  }
  throw new Error("Product ID not found: " + payload.id);
}

function addUser(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Users");
  const newId = payload.id || `U${Date.now()}`;
  userSheet.appendRow([
    newId,
    payload.fullName,
    payload.email,
    payload.password,
    payload.role || "user",
    payload.status || "Active"
  ]);
  return { id: newId, fullName: payload.fullName, email: payload.email, role: payload.role || "user", status: payload.status || "Active" };
}

function updateUser(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Users");
  const data = userSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == payload.id) {
      if (payload.fullName !== undefined) userSheet.getRange(i + 1, 2).setValue(payload.fullName);
      if (payload.email !== undefined) userSheet.getRange(i + 1, 3).setValue(payload.email);
      if (payload.password !== undefined) userSheet.getRange(i + 1, 4).setValue(payload.password);
      if (payload.role !== undefined) userSheet.getRange(i + 1, 5).setValue(payload.role);
      if (payload.status !== undefined) userSheet.getRange(i + 1, 6).setValue(payload.status);
      return payload;
    }
  }
  throw new Error("User ID not found: " + payload.id);
}

function deleteUser(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Users");
  const data = userSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == payload.id) {
      userSheet.deleteRow(i + 1);
      return { success: true, id: payload.id };
    }
  }
  throw new Error("User ID not found: " + payload.id);
}

function updateSettings(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Settings");
    settingsSheet.appendRow(["Key", "Value"]);
  }
  const data = settingsSheet.getDataRange().getValues();
  const keys = Object.keys(payload);
  keys.forEach(key => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == key) {
        settingsSheet.getRange(i + 1, 2).setValue(payload[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      settingsSheet.appendRow([key, payload[key]]);
    }
  });
  return payload;
}
