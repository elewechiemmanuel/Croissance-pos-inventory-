import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

function parseDeviceString(userAgent: string): string {
  if (!userAgent) return "Web Browser";
  let os = "Desktop";
  if (/windows/i.test(userAgent)) os = "Windows PC";
  else if (/macintosh|mac os/i.test(userAgent)) os = "macOS";
  else if (/android/i.test(userAgent)) os = "Android Mobile";
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS Device";
  else if (/linux/i.test(userAgent)) os = "Linux";

  let browser = "Browser";
  if (/chrome|crios/i.test(userAgent)) browser = "Chrome";
  else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";
  else if (/edg/i.test(userAgent)) browser = "Edge";

  return `${browser} (${os})`;
}

// --- MOCK DATABASE FOR TESTING ---
// This acts as our fallback if the Google Sheets API is not yet configured.
let db = {
  users: [
    { 
      id: "U1", 
      fullName: "Admin User", 
      email: "admin@croissance.com", 
      password: "password123", 
      role: "admin" as const, 
      status: "Active",
      isOnline: true,
      lastLogin: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      deviceInfo: "Chrome (Windows PC - Lekki Admin Desk)",
      lastLoginIp: "197.210.226.45",
      currentStation: "Lekki Admin Office",
      sessionId: "SESS_1"
    },
    { 
      id: "U2", 
      fullName: "Sales Attendant", 
      email: "sales@croissance.com", 
      password: "password123", 
      role: "user" as const, 
      status: "Active",
      isOnline: true,
      lastLogin: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      deviceInfo: "Chrome (POS Terminal 1 - Station Bay)",
      lastLoginIp: "197.210.226.46",
      currentStation: "Pump Island 1 / LPG Bay",
      sessionId: "SESS_2"
    },
    { 
      id: "U3", 
      fullName: "Admin Tester", 
      email: "admincroissance@gmail.com", 
      password: "password123", 
      role: "admin" as const, 
      status: "Active",
      isOnline: false,
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      deviceInfo: "Safari (macOS)",
      lastLoginIp: "102.89.44.12",
      currentStation: "Remote Management",
      sessionId: "SESS_3"
    }
  ],
  activeSessions: [
    {
      id: "SESS_1",
      userId: "U1",
      fullName: "Admin User",
      email: "admin@croissance.com",
      role: "admin",
      loginTime: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      deviceInfo: "Chrome (Windows PC - Lekki Admin Desk)",
      ip: "197.210.226.45",
      station: "Lekki Admin Office",
      isOnline: true
    },
    {
      id: "SESS_2",
      userId: "U2",
      fullName: "Sales Attendant",
      email: "sales@croissance.com",
      role: "user",
      loginTime: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      deviceInfo: "Chrome (POS Terminal 1 - Station Bay)",
      ip: "197.210.226.46",
      station: "Pump Island 1 / LPG Bay",
      isOnline: true
    }
  ],
  products: [
    { id: "P1", name: "LPG 12.5kg Cylinder", category: "LPG", type: "LPG", salesType: "Retail", unit: "KG", buyingPrice: 10000, sellingPrice: 12500, wholesalePrice: 11500, openingStock: 50, currentStock: 50, minStock: 10, status: "Active" },
    { id: "P2", name: "Diesel (AGO)", category: "Diesel", type: "Diesel", salesType: "Retail", unit: "Litre", buyingPrice: 1100, sellingPrice: 1350, wholesalePrice: 1300, openingStock: 5000, currentStock: 5000, minStock: 500, status: "Active" }
  ],
  customers: [
    { id: "C1", fullName: "Walk-in Customer", phone: "", address: "", type: "Retail", businessName: "", totalPurchases: 0, creditLimit: 0, outstandingBalance: 0 },
    { id: "C2", fullName: "John Doe", phone: "08012345678", address: "Lekki, Lagos", type: "Retail", businessName: "", totalPurchases: 25000, creditLimit: 0, outstandingBalance: 0 },
    { id: "C3", fullName: "ABC Logistics Ltd", phone: "08123456789", address: "Ajah, Lagos", type: "Wholesale", businessName: "ABC Logistics Ltd", totalPurchases: 2450000, creditLimit: 3000000, outstandingBalance: 450000 },
    { id: "C4", fullName: "Dangote Site Fleet Ops", phone: "08098765432", address: "Ibeju Lekki Expressway, Lagos", type: "Wholesale", businessName: "Dangote Site Contractors", totalPurchases: 5600000, creditLimit: 8000000, outstandingBalance: 1200000 }
  ],
  sales: [
    {
      id: "S101",
      invoiceNumber: "INV-2026-001",
      date: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      customerId: "C3",
      customerName: "ABC Logistics Ltd",
      customerPhone: "08123456789",
      staffId: "U2",
      staffName: "Sales Attendant",
      station: "Pump Island 1 / AGO Bay",
      items: [
        {
          productId: "P2",
          productName: "Diesel (AGO)",
          category: "Diesel",
          quantity: 1500,
          unitPrice: 1300,
          costPrice: 1100,
          totalPrice: 1950000,
          unit: "Litre"
        }
      ],
      subtotal: 1950000,
      discount: 0,
      totalAmount: 1950000,
      paymentMethod: "Bank Transfer",
      paymentStatus: "Paid",
      vehicleNumber: "KJA-492XA (Mack Tanker)",
      driverName: "Tunde Bakare",
      notes: "Commercial fleet supply delivery"
    },
    {
      id: "S102",
      invoiceNumber: "INV-2026-002",
      date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      customerId: "C2",
      customerName: "John Doe",
      customerPhone: "08012345678",
      staffId: "U2",
      staffName: "Sales Attendant",
      station: "Pump Island 1 / LPG Bay",
      items: [
        {
          productId: "P1",
          productName: "LPG 12.5kg Cylinder",
          category: "LPG",
          quantity: 2,
          unitPrice: 12500,
          costPrice: 10000,
          totalPrice: 25000,
          unit: "KG"
        }
      ],
      subtotal: 25000,
      discount: 0,
      totalAmount: 25000,
      paymentMethod: "POS Terminal",
      paymentStatus: "Paid",
      vehicleNumber: "",
      driverName: "",
      notes: "Walk-in retail swap"
    }
  ],
  purchases: [],
  auditLogs: [
    {
      id: "AUD-1001",
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      action: "PRICE_CHANGE",
      category: "PRICING",
      severity: "HIGH",
      actorId: "U1",
      actorName: "Admin User",
      actorEmail: "admin@croissance.com",
      actorRole: "admin",
      ipAddress: "197.210.226.45",
      terminalStation: "Lekki Admin Office",
      targetEntityId: "P2",
      targetEntityName: "Diesel (AGO)",
      description: "Retail and wholesale price adjusted following new ex-depot landing cost notice.",
      reason: "Depot benchmark price revised by NNPC / NMDPRA notice",
      previousValue: { buyingPrice: 1050, sellingPrice: 1280, wholesalePrice: 1220 },
      newValue: { buyingPrice: 1100, sellingPrice: 1350, wholesalePrice: 1300 },
      diffSummary: "Selling Price: ₦1,280 → ₦1,350 (+₦70/L); Buying Price: ₦1,050 → ₦1,100 (+₦50/L)"
    },
    {
      id: "AUD-1002",
      timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      action: "STOCK_ADJUSTMENT",
      category: "INVENTORY",
      severity: "HIGH",
      actorId: "U1",
      actorName: "Admin User",
      actorEmail: "admin@croissance.com",
      actorRole: "admin",
      ipAddress: "197.210.226.45",
      terminalStation: "Lekki Admin Office",
      targetEntityId: "P2",
      targetEntityName: "Diesel (AGO)",
      description: "Physical underground tank dip reconciliation.",
      reason: "Morning physical dip vs ATG reading reconciliation (+120 Litres temperature expansion)",
      previousValue: { currentStock: 4880 },
      newValue: { currentStock: 5000 },
      diffSummary: "Stock: 4,880 Litres → 5,000 Litres (+120 Litres variance)"
    },
    {
      id: "AUD-1003",
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      action: "STOCK_ADJUSTMENT",
      category: "INVENTORY",
      severity: "MEDIUM",
      actorId: "U1",
      actorName: "Admin User",
      actorEmail: "admin@croissance.com",
      actorRole: "admin",
      ipAddress: "197.210.226.45",
      terminalStation: "Lekki Admin Office",
      targetEntityId: "P1",
      targetEntityName: "LPG 12.5kg Cylinder",
      description: "Manual stock count adjustment for empty cylinder arrivals.",
      reason: "Weekly cylinder swap verification with warehouse records",
      previousValue: { currentStock: 45 },
      newValue: { currentStock: 50 },
      diffSummary: "Stock: 45 Units → 50 Units (+5 Units)"
    },
    {
      id: "AUD-1004",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      action: "SETTINGS_UPDATED",
      category: "SETTINGS",
      severity: "MEDIUM",
      actorId: "U1",
      actorName: "Admin User",
      actorEmail: "admin@croissance.com",
      actorRole: "admin",
      ipAddress: "197.210.226.45",
      terminalStation: "Lekki Admin Office",
      targetEntityId: "SETTINGS",
      targetEntityName: "Company Banking Details",
      description: "Configured secondary settlement account (Zenith Bank).",
      reason: "Added backup corporate settlement account for wholesale transfers",
      previousValue: { secondaryBankName: "", secondaryAccountNumber: "" },
      newValue: { secondaryBankName: "Zenith Bank PLC", secondaryAccountNumber: "1019283746" },
      diffSummary: "Added secondary settlement bank: Zenith Bank PLC (1019283746)"
    }
  ],
  settings: {
    businessName: "Croissance Oil and Gas Ltd",
    rcNumber: "1292088",
    stationAddress: "Abule Pan Bus Stop, Ibeju Lekki, OPC Junction, Lagos, Nigeria.",
    officeAddress: "Block A3-500, HFP Eastline Shopping Complex, Ajah, Lagos, Nigeria.",
    phoneNumbers: "08131307891, 08164782722",
    email: "accounts@croissanceoil.com",
    bankName: "First Bank of Nigeria",
    accountNumber: "2034891234",
    accountName: "Croissance Oil and Gas Ltd",
    bankBranch: "Ajah Branch, Lagos",
    sortCode: "011152303",
    taxIdNumber: "TIN-1292088-001",
    paymentInstructions: "Please use your Invoice / Waybill number as narration/reference and notify sales cashier upon transfer.",
    secondaryBankName: "Zenith Bank PLC",
    secondaryAccountNumber: "1019283746",
    secondaryAccountName: "Croissance Oil and Gas Ltd"
  }
};

function getActorInfo(payload: any, req: express.Request) {
  const actor = payload._actor || payload.actor || {};
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
  const agent = req.headers['user-agent'] ? parseDeviceString(req.headers['user-agent'] as string) : "Web Browser";
  return {
    actorId: actor.id || "U1",
    actorName: actor.fullName || actor.name || "Admin User",
    actorEmail: actor.email || "admin@croissance.com",
    actorRole: actor.role || "admin",
    terminalStation: actor.station || actor.currentStation || "Lekki Admin Office",
    ipAddress: ip,
    device: agent
  };
}

function logAuditEvent(entry: {
  action: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  actorId?: string;
  actorName: string;
  actorEmail?: string;
  actorRole?: string;
  ipAddress?: string;
  terminalStation?: string;
  targetEntityId: string;
  targetEntityName: string;
  description: string;
  reason?: string;
  previousValue?: any;
  newValue?: any;
  diffSummary?: string;
  metadata?: Record<string, any>;
}) {
  const newAudit = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  if (!(db as any).auditLogs) {
    (db as any).auditLogs = [];
  }
  (db as any).auditLogs.unshift(newAudit);
  return newAudit;
}

// --- API ENDPOINTS ---

// Generic Google Sheets Proxy Endpoint
app.post("/api/sheets", async (req, res) => {
  const { action, payload } = req.body;

  const scriptUrl = process.env.GOOGLE_SHEETS_WEB_APP_URL || (db.settings as any)?.googleSheetsWebAppUrl;

  // If a real Google Sheets Web App URL is configured, forward the request to it.
  if (scriptUrl) {
    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload })
      });
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error("Error connecting to Google Sheets:", error);
      return res.status(500).json({ success: false, message: "Failed to connect to Google Sheets database." });
    }
  }

  // FALLBACK: Use Mock Local Database
  try {
    let responseData = null;
    
    switch (action) {
      case 'getInitialData': {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const sanitizedUsers = db.users.map(u => {
          const isRecentlyActive = u.lastActiveAt ? (new Date(u.lastActiveAt).getTime() > fiveMinutesAgo) : false;
          return {
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            role: u.role,
            status: u.status,
            isOnline: Boolean(u.isOnline && isRecentlyActive),
            lastLogin: u.lastLogin,
            lastActiveAt: u.lastActiveAt,
            deviceInfo: u.deviceInfo,
            lastLoginIp: u.lastLoginIp,
            currentStation: u.currentStation
          };
        });

        const activeSessionsList = ((db as any).activeSessions || []).map((s: any) => ({
          ...s,
          isOnline: Boolean(s.isOnline && (new Date(s.lastActiveAt).getTime() > fiveMinutesAgo))
        }));

        responseData = {
          products: db.products,
          customers: db.customers,
          sales: db.sales,
          purchases: db.purchases,
          settings: db.settings,
          users: sanitizedUsers,
          activeSessions: activeSessionsList,
          auditLogs: (db as any).auditLogs || []
        };
        break;
      }

      case 'login': {
        const inputEmail = (payload.email || '').toLowerCase().trim();
        const user = db.users.find(u => u.email.toLowerCase() === inputEmail && u.password === payload.password);
        if (user) {
          if (user.status === "Inactive") {
            throw new Error("This user account is deactivated. Please contact the administrator.");
          }
          const nowIso = new Date().toISOString();
          const clientDevice = payload.deviceInfo || (req.headers['user-agent'] ? parseDeviceString(req.headers['user-agent'] as string) : "Desktop Browser");
          const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
          const clientStation = payload.station || (user.role === "admin" ? "Admin Office" : "Station POS Terminal");

          user.isOnline = true;
          user.lastLogin = nowIso;
          user.lastActiveAt = nowIso;
          user.deviceInfo = clientDevice;
          user.lastLoginIp = clientIp;
          user.currentStation = clientStation;

          const sessId = `SESS_${Date.now()}`;
          user.sessionId = sessId;

          if (!(db as any).activeSessions) (db as any).activeSessions = [];
          (db as any).activeSessions = (db as any).activeSessions.filter((s: any) => s.userId !== user.id);
          (db as any).activeSessions.unshift({
            id: sessId,
            userId: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            loginTime: nowIso,
            lastActiveAt: nowIso,
            deviceInfo: clientDevice,
            ip: clientIp,
            station: clientStation,
            isOnline: true
          });

          responseData = { 
            user: { 
              id: user.id, 
              fullName: user.fullName, 
              role: user.role, 
              email: user.email, 
              status: user.status,
              isOnline: true,
              lastLogin: user.lastLogin,
              lastActiveAt: user.lastActiveAt,
              deviceInfo: user.deviceInfo,
              currentStation: user.currentStation,
              sessionId: sessId
            } 
          };
        } else {
          throw new Error("Invalid credentials");
        }
        break;
      }

      case 'googleLogin': {
        const gEmail = (payload.email || '').toLowerCase().trim();
        let gUser = db.users.find(u => u.email.toLowerCase() === gEmail);
        const nowIso = new Date().toISOString();
        const clientDevice = payload.deviceInfo || (req.headers['user-agent'] ? parseDeviceString(req.headers['user-agent'] as string) : "Desktop Browser");
        const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
        const sessId = `SESS_${Date.now()}`;

        if (!gUser) {
          if (gEmail === 'admincroissance@gmail.com' || gEmail.includes('admin') || gEmail === 'elewechiemmanuel@gmail.com') {
            gUser = {
              id: `U${Date.now()}`,
              fullName: payload.fullName || "Admin Tester",
              email: gEmail,
              password: "password123",
              role: "admin" as const,
              status: "Active",
              isOnline: true,
              lastLogin: nowIso,
              lastActiveAt: nowIso,
              deviceInfo: clientDevice,
              lastLoginIp: clientIp,
              currentStation: "Admin Office",
              sessionId: sessId
            };
            db.users.push(gUser);
          } else {
            throw new Error(`Email ${gEmail} is not authorized for staff or admin login.`);
          }
        }
        if (gUser.status === "Inactive") {
          throw new Error("This user account is deactivated. Please contact the administrator.");
        }

        const clientStation = payload.station || (gUser.role === "admin" ? "Admin Office" : "Station POS Terminal");
        gUser.isOnline = true;
        gUser.lastLogin = nowIso;
        gUser.lastActiveAt = nowIso;
        gUser.deviceInfo = clientDevice;
        gUser.lastLoginIp = clientIp;
        gUser.currentStation = clientStation;
        gUser.sessionId = sessId;

        if (!(db as any).activeSessions) (db as any).activeSessions = [];
        (db as any).activeSessions = (db as any).activeSessions.filter((s: any) => s.userId !== gUser.id);
        (db as any).activeSessions.unshift({
          id: sessId,
          userId: gUser.id,
          fullName: gUser.fullName,
          email: gUser.email,
          role: gUser.role,
          loginTime: nowIso,
          lastActiveAt: nowIso,
          deviceInfo: clientDevice,
          ip: clientIp,
          station: clientStation,
          isOnline: true
        });

        responseData = { 
          user: { 
            id: gUser.id, 
            fullName: gUser.fullName, 
            role: gUser.role, 
            email: gUser.email, 
            status: gUser.status,
            isOnline: true,
            lastLogin: gUser.lastLogin,
            lastActiveAt: gUser.lastActiveAt,
            deviceInfo: gUser.deviceInfo,
            currentStation: gUser.currentStation,
            sessionId: sessId
          } 
        };
        break;
      }

      case 'heartbeat': {
        const userId = payload.userId;
        const nowIso = new Date().toISOString();
        const u = db.users.find(x => x.id === userId);
        if (u) {
          u.isOnline = true;
          u.lastActiveAt = nowIso;
          if (payload.deviceInfo) u.deviceInfo = payload.deviceInfo;
          if (payload.station) u.currentStation = payload.station;
        }
        if ((db as any).activeSessions) {
          const sess = (db as any).activeSessions.find((s: any) => s.userId === userId);
          if (sess) {
            sess.lastActiveAt = nowIso;
            sess.isOnline = true;
          }
        }
        responseData = { success: true, timestamp: nowIso };
        break;
      }

      case 'logout': {
        const userId = payload.userId;
        const nowIso = new Date().toISOString();
        const u = db.users.find(x => x.id === userId);
        if (u) {
          u.isOnline = false;
          u.lastActiveAt = nowIso;
        }
        if ((db as any).activeSessions) {
          (db as any).activeSessions = (db as any).activeSessions.filter((s: any) => s.userId !== userId);
        }
        responseData = { success: true };
        break;
      }

      case 'forceLogoutUser': {
        const targetUserId = payload.userId;
        const u = db.users.find(x => x.id === targetUserId);
        if (u) {
          u.isOnline = false;
          u.lastActiveAt = new Date().toISOString();
        }
        if ((db as any).activeSessions) {
          (db as any).activeSessions = (db as any).activeSessions.filter((s: any) => s.userId !== targetUserId);
        }
        responseData = { success: true, message: "User session terminated successfully" };
        break;
      }

      case 'getActiveSessions': {
        const fiveMin = Date.now() - 5 * 60 * 1000;
        const activeList = ((db as any).activeSessions || []).filter((s: any) => {
          return s.isOnline && (new Date(s.lastActiveAt).getTime() > fiveMin);
        });
        responseData = { activeSessions: activeList };
        break;
      }

      case 'addUser': {
        if (!payload.email || !payload.fullName || !payload.password) {
          throw new Error("Full name, email, and password are required.");
        }
        const existingUser = db.users.find(u => u.email.toLowerCase() === payload.email.toLowerCase().trim());
        if (existingUser) {
          throw new Error("A user with this email already exists.");
        }
        const newUser = {
          id: `U${Date.now()}`,
          fullName: payload.fullName.trim(),
          email: payload.email.toLowerCase().trim(),
          password: payload.password,
          role: (payload.role === "admin" ? "admin" : "user") as "admin" | "user",
          status: payload.status || "Active",
          isOnline: false,
          lastLogin: "",
          lastActiveAt: "",
          deviceInfo: "",
          lastLoginIp: "",
          currentStation: "Lekki Station",
          sessionId: ""
        };
        db.users.push(newUser);

        const actor = getActorInfo(payload, req);
        logAuditEvent({
          action: "USER_CREATED",
          category: "USERS",
          severity: "MEDIUM",
          actorId: actor.actorId,
          actorName: actor.actorName,
          actorEmail: actor.actorEmail,
          actorRole: actor.actorRole,
          ipAddress: actor.ipAddress,
          terminalStation: actor.terminalStation,
          targetEntityId: newUser.id,
          targetEntityName: newUser.fullName,
          description: `Created new user account: ${newUser.fullName} (${newUser.email}) with role [${newUser.role.toUpperCase()}]`,
          reason: payload.reason || "Staff account onboarding",
          previousValue: null,
          newValue: { fullName: newUser.fullName, email: newUser.email, role: newUser.role, status: newUser.status },
          diffSummary: `New user created: ${newUser.fullName} [${newUser.role}]`
        });

        responseData = { id: newUser.id, fullName: newUser.fullName, email: newUser.email, role: newUser.role, status: newUser.status };
        break;
      }

      case 'updateUser': {
        const uIndex = db.users.findIndex(u => u.id === payload.id);
        if (uIndex !== -1) {
          if (payload.email) {
            const duplicate = db.users.find(u => u.id !== payload.id && u.email.toLowerCase() === payload.email.toLowerCase().trim());
            if (duplicate) {
              throw new Error("Another user already has this email address.");
            }
          }
          const prevUser = { ...db.users[uIndex] };
          db.users[uIndex] = {
            ...db.users[uIndex],
            fullName: payload.fullName !== undefined ? payload.fullName.trim() : db.users[uIndex].fullName,
            email: payload.email !== undefined ? payload.email.toLowerCase().trim() : db.users[uIndex].email,
            role: payload.role !== undefined ? payload.role : db.users[uIndex].role,
            status: payload.status !== undefined ? payload.status : db.users[uIndex].status,
            password: payload.password ? payload.password : db.users[uIndex].password
          };
          const updated = db.users[uIndex];

          const actor = getActorInfo(payload, req);
          const changedFields: string[] = [];
          if (prevUser.role !== updated.role) changedFields.push(`Role: ${prevUser.role} → ${updated.role}`);
          if (prevUser.status !== updated.status) changedFields.push(`Status: ${prevUser.status} → ${updated.status}`);
          if (payload.password) changedFields.push(`Password reset`);
          if (prevUser.fullName !== updated.fullName) changedFields.push(`Name: ${prevUser.fullName} → ${updated.fullName}`);

          if (changedFields.length > 0) {
            logAuditEvent({
              action: "USER_UPDATED",
              category: "USERS",
              severity: prevUser.role !== updated.role || prevUser.status !== updated.status ? "HIGH" : "MEDIUM",
              actorId: actor.actorId,
              actorName: actor.actorName,
              actorEmail: actor.actorEmail,
              actorRole: actor.actorRole,
              ipAddress: actor.ipAddress,
              terminalStation: actor.terminalStation,
              targetEntityId: updated.id,
              targetEntityName: updated.fullName,
              description: `User account modified for ${updated.fullName} (${updated.email}): ${changedFields.join(", ")}`,
              reason: payload.reason || "Staff profile or privileges update",
              previousValue: { fullName: prevUser.fullName, email: prevUser.email, role: prevUser.role, status: prevUser.status },
              newValue: { fullName: updated.fullName, email: updated.email, role: updated.role, status: updated.status },
              diffSummary: changedFields.join(" • ")
            });
          }

          responseData = { id: updated.id, fullName: updated.fullName, email: updated.email, role: updated.role, status: updated.status };
        } else {
          throw new Error("User not found.");
        }
        break;
      }

      case 'deleteUser': {
        const delUIndex = db.users.findIndex(u => u.id === payload.id);
        if (delUIndex !== -1) {
          const removed = db.users.splice(delUIndex, 1)[0];
          const actor = getActorInfo(payload, req);

          logAuditEvent({
            action: "USER_DELETED",
            category: "USERS",
            severity: "HIGH",
            actorId: actor.actorId,
            actorName: actor.actorName,
            actorEmail: actor.actorEmail,
            actorRole: actor.actorRole,
            ipAddress: actor.ipAddress,
            terminalStation: actor.terminalStation,
            targetEntityId: removed.id,
            targetEntityName: removed.fullName,
            description: `User account deleted: ${removed.fullName} (${removed.email}) [${removed.role}]`,
            reason: payload.reason || "Staff account deprovisioning",
            previousValue: { fullName: removed.fullName, email: removed.email, role: removed.role, status: removed.status },
            newValue: null,
            diffSummary: `Permanently removed user ${removed.fullName} (${removed.email})`
          });

          responseData = { id: removed.id, success: true };
        } else {
          throw new Error("User not found.");
        }
        break;
      }

      case 'addProduct': {
        const newProd = { 
          ...payload, 
          id: `P${Date.now()}`, 
          buyingPrice: Number(payload.buyingPrice || 0),
          sellingPrice: Number(payload.sellingPrice || 0),
          wholesalePrice: Number(payload.wholesalePrice || 0),
          openingStock: Number(payload.openingStock !== undefined ? payload.openingStock : (payload.currentStock || 0)),
          currentStock: Number(payload.currentStock !== undefined ? payload.currentStock : (payload.openingStock || 0)),
          minStock: Number(payload.minStock || 0)
        };
        db.products.push(newProd);

        const actor = getActorInfo(payload, req);
        logAuditEvent({
          action: "PRODUCT_CREATED",
          category: "INVENTORY",
          severity: "MEDIUM",
          actorId: actor.actorId,
          actorName: actor.actorName,
          actorEmail: actor.actorEmail,
          actorRole: actor.actorRole,
          ipAddress: actor.ipAddress,
          terminalStation: actor.terminalStation,
          targetEntityId: newProd.id,
          targetEntityName: newProd.name,
          description: `Catalogued new product "${newProd.name}" (${newProd.category})`,
          reason: payload.reason || "Product catalog expansion",
          previousValue: null,
          newValue: {
            name: newProd.name,
            sellingPrice: newProd.sellingPrice,
            wholesalePrice: newProd.wholesalePrice,
            buyingPrice: newProd.buyingPrice,
            currentStock: newProd.currentStock,
            unit: newProd.unit
          },
          diffSummary: `Retail: ₦${newProd.sellingPrice.toLocaleString()} • Wholesale: ₦${newProd.wholesalePrice.toLocaleString()} • Initial Stock: ${newProd.currentStock} ${newProd.unit}`
        });

        responseData = newProd;
        break;
      }

      case 'batchImportProducts': {
        const items = payload.items;
        const mode = payload.mode || 'upsert';
        if (!Array.isArray(items)) {
          throw new Error("Invalid import data: items must be an array.");
        }

        let addedCount = 0;
        let updatedCount = 0;
        const now = Date.now();

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item.name || !String(item.name).trim()) continue;

          const trimmedName = String(item.name).trim().toLowerCase();
          const existingIndex = db.products.findIndex(
            p => (item.id && p.id === item.id) || p.name.trim().toLowerCase() === trimmedName
          );

          if (existingIndex !== -1) {
            // Existing product found
            if (mode === 'addOnly') {
              continue;
            }

            const existing = db.products[existingIndex];
            if (mode === 'stockOnly') {
              db.products[existingIndex] = {
                ...existing,
                currentStock: item.currentStock !== undefined && !isNaN(Number(item.currentStock))
                  ? Number(item.currentStock)
                  : existing.currentStock
              };
            } else {
              db.products[existingIndex] = {
                ...existing,
                category: item.category ? String(item.category).trim() : existing.category,
                type: item.type ? String(item.type).trim() : existing.type,
                salesType: item.salesType === 'Wholesale' ? 'Wholesale' : (item.salesType === 'Retail' ? 'Retail' : existing.salesType),
                unit: item.unit ? String(item.unit).trim() : existing.unit,
                buyingPrice: item.buyingPrice !== undefined && !isNaN(Number(item.buyingPrice)) ? Number(item.buyingPrice) : existing.buyingPrice,
                sellingPrice: item.sellingPrice !== undefined && !isNaN(Number(item.sellingPrice)) ? Number(item.sellingPrice) : existing.sellingPrice,
                wholesalePrice: item.wholesalePrice !== undefined && !isNaN(Number(item.wholesalePrice)) ? Number(item.wholesalePrice) : existing.wholesalePrice,
                currentStock: item.currentStock !== undefined && !isNaN(Number(item.currentStock)) ? Number(item.currentStock) : existing.currentStock,
                minStock: item.minStock !== undefined && !isNaN(Number(item.minStock)) ? Number(item.minStock) : existing.minStock,
                status: item.status ? String(item.status).trim() : existing.status
              };
            }
            updatedCount++;
          } else {
            // New product to be added
            if (mode === 'stockOnly') {
              continue;
            }

            const newProd = {
              id: item.id && !db.products.some(p => p.id === item.id) ? item.id : `P${now + i}`,
              name: String(item.name).trim(),
              category: item.category ? String(item.category).trim() : "General",
              type: item.type ? String(item.type).trim() : (item.category ? String(item.category).trim() : "General"),
              salesType: (item.salesType === 'Wholesale' ? 'Wholesale' : 'Retail') as ("Retail" | "Wholesale"),
              unit: item.unit ? String(item.unit).trim() : "Unit",
              buyingPrice: Number(item.buyingPrice) || 0,
              sellingPrice: Number(item.sellingPrice) || 0,
              wholesalePrice: Number(item.wholesalePrice) || (Number(item.sellingPrice) ? Math.round(Number(item.sellingPrice) * 0.95) : 0),
              openingStock: Number(item.openingStock !== undefined ? item.openingStock : (item.currentStock || 0)),
              currentStock: Number(item.currentStock !== undefined ? item.currentStock : (item.openingStock || 0)),
              minStock: Number(item.minStock !== undefined ? item.minStock : 10),
              status: item.status === 'Inactive' ? 'Inactive' : 'Active'
            };
            db.products.push(newProd);
            addedCount++;
          }
        }

        responseData = {
          success: true,
          addedCount,
          updatedCount,
          totalProducts: db.products.length,
          products: db.products
        };
        break;
      }

      case 'updateProduct': {
        const prodIndex = db.products.findIndex(p => p.id === payload.id);
        if (prodIndex === -1) {
          throw new Error("Product not found");
        }
        const existingProd = db.products[prodIndex];
        const actor = getActorInfo(payload, req);

        const newBuying = payload.buyingPrice !== undefined ? Number(payload.buyingPrice) : existingProd.buyingPrice;
        const newSelling = payload.sellingPrice !== undefined ? Number(payload.sellingPrice) : existingProd.sellingPrice;
        const newWholesale = payload.wholesalePrice !== undefined ? Number(payload.wholesalePrice) : existingProd.wholesalePrice;
        const newStock = payload.currentStock !== undefined ? Number(payload.currentStock) : existingProd.currentStock;

        // Check for price modifications
        const priceChanged = 
          newBuying !== existingProd.buyingPrice ||
          newSelling !== existingProd.sellingPrice ||
          newWholesale !== existingProd.wholesalePrice;

        // Check for stock modifications
        const stockChanged = newStock !== existingProd.currentStock;

        db.products[prodIndex] = { 
          ...existingProd, 
          ...payload,
          buyingPrice: newBuying,
          sellingPrice: newSelling,
          wholesalePrice: newWholesale,
          currentStock: newStock,
          openingStock: payload.openingStock !== undefined ? Number(payload.openingStock) : existingProd.openingStock,
          minStock: payload.minStock !== undefined ? Number(payload.minStock) : existingProd.minStock,
        };
        const updatedProd = db.products[prodIndex];

        // 1. Audit log Price Change
        if (priceChanged) {
          const diffItems: string[] = [];
          if (newSelling !== existingProd.sellingPrice) {
            const diff = newSelling - existingProd.sellingPrice;
            diffItems.push(`Retail: ₦${existingProd.sellingPrice.toLocaleString()} → ₦${newSelling.toLocaleString()} (${diff > 0 ? "+" : ""}₦${diff.toLocaleString()})`);
          }
          if (newWholesale !== existingProd.wholesalePrice) {
            const diff = newWholesale - existingProd.wholesalePrice;
            diffItems.push(`Wholesale: ₦${existingProd.wholesalePrice.toLocaleString()} → ₦${newWholesale.toLocaleString()} (${diff > 0 ? "+" : ""}₦${diff.toLocaleString()})`);
          }
          if (newBuying !== existingProd.buyingPrice) {
            const diff = newBuying - existingProd.buyingPrice;
            diffItems.push(`Cost: ₦${existingProd.buyingPrice.toLocaleString()} → ₦${newBuying.toLocaleString()} (${diff > 0 ? "+" : ""}₦${diff.toLocaleString()})`);
          }

          logAuditEvent({
            action: "PRICE_CHANGE",
            category: "PRICING",
            severity: "HIGH",
            actorId: actor.actorId,
            actorName: actor.actorName,
            actorEmail: actor.actorEmail,
            actorRole: actor.actorRole,
            ipAddress: actor.ipAddress,
            terminalStation: actor.terminalStation,
            targetEntityId: updatedProd.id,
            targetEntityName: updatedProd.name,
            description: `Product price revised for "${updatedProd.name}" (${updatedProd.category})`,
            reason: payload.reason?.trim() || "Manual price tariff adjustment",
            previousValue: {
              sellingPrice: existingProd.sellingPrice,
              wholesalePrice: existingProd.wholesalePrice,
              buyingPrice: existingProd.buyingPrice
            },
            newValue: {
              sellingPrice: newSelling,
              wholesalePrice: newWholesale,
              buyingPrice: newBuying
            },
            diffSummary: diffItems.join(" • "),
            metadata: {
              unit: updatedProd.unit,
              category: updatedProd.category
            }
          });
        }

        // 2. Audit log Stock Adjustment
        if (stockChanged) {
          const diff = newStock - existingProd.currentStock;
          logAuditEvent({
            action: "STOCK_ADJUSTMENT",
            category: "INVENTORY",
            severity: Math.abs(diff) > 500 ? "HIGH" : "MEDIUM",
            actorId: actor.actorId,
            actorName: actor.actorName,
            actorEmail: actor.actorEmail,
            actorRole: actor.actorRole,
            ipAddress: actor.ipAddress,
            terminalStation: actor.terminalStation,
            targetEntityId: updatedProd.id,
            targetEntityName: updatedProd.name,
            description: `Stock level adjusted for "${updatedProd.name}"`,
            reason: payload.reason?.trim() || "Stock count / physical reconciliation adjustment",
            previousValue: { currentStock: existingProd.currentStock },
            newValue: { currentStock: newStock },
            diffSummary: `${existingProd.currentStock.toLocaleString()} ${existingProd.unit} → ${newStock.toLocaleString()} ${existingProd.unit} (${diff > 0 ? "+" : ""}${diff.toLocaleString()} ${existingProd.unit} variance)`,
            metadata: {
              variance: diff,
              unit: updatedProd.unit
            }
          });
        }

        responseData = updatedProd;
        break;
      }

      case 'adjustStock': {
        const prod = db.products.find(p => p.id === payload.productId || p.id === payload.id);
        if (!prod) throw new Error("Product not found");
        const actor = getActorInfo(payload, req);
        const oldStock = prod.currentStock;
        const newStock = Number(payload.newStock !== undefined ? payload.newStock : (oldStock + Number(payload.quantityDelta || 0)));
        prod.currentStock = newStock;
        const diff = newStock - oldStock;
        const reason = payload.reason?.trim() || "Physical tank dip reconciliation / calibrated reading";

        logAuditEvent({
          action: "STOCK_ADJUSTMENT",
          category: "INVENTORY",
          severity: Math.abs(diff) > 500 ? "HIGH" : "MEDIUM",
          actorId: actor.actorId,
          actorName: actor.actorName,
          actorEmail: actor.actorEmail,
          actorRole: actor.actorRole,
          ipAddress: actor.ipAddress,
          terminalStation: actor.terminalStation,
          targetEntityId: prod.id,
          targetEntityName: prod.name,
          description: `Direct stock level calibration for "${prod.name}"`,
          reason: reason,
          previousValue: { currentStock: oldStock },
          newValue: { currentStock: newStock },
          diffSummary: `${oldStock.toLocaleString()} ${prod.unit} → ${newStock.toLocaleString()} ${prod.unit} (${diff > 0 ? "+" : ""}${diff.toLocaleString()} ${prod.unit})`,
          metadata: { variance: diff, unit: prod.unit }
        });

        responseData = prod;
        break;
      }

      case 'deleteProduct': {
        const delIndex = db.products.findIndex(p => p.id === payload.id);
        if (delIndex !== -1) {
          const removed = db.products.splice(delIndex, 1)[0];
          const actor = getActorInfo(payload, req);

          logAuditEvent({
            action: "PRODUCT_DELETED",
            category: "INVENTORY",
            severity: "HIGH",
            actorId: actor.actorId,
            actorName: actor.actorName,
            actorEmail: actor.actorEmail,
            actorRole: actor.actorRole,
            ipAddress: actor.ipAddress,
            terminalStation: actor.terminalStation,
            targetEntityId: removed.id,
            targetEntityName: removed.name,
            description: `Product removed from system catalog: "${removed.name}"`,
            reason: payload.reason || "Discontinued item removal",
            previousValue: removed,
            newValue: null,
            diffSummary: `Deleted product "${removed.name}" (Stock: ${removed.currentStock} ${removed.unit})`
          });

          responseData = removed;
        } else {
          throw new Error("Product not found");
        }
        break;
      }

      case 'addCustomer':
        const newCust = { 
          ...payload, 
          id: `C${Date.now()}`, 
          totalPurchases: Number(payload.totalPurchases || 0),
          creditLimit: payload.type === 'Wholesale' ? Math.max(0, Number(payload.creditLimit || 0)) : 0,
          outstandingBalance: payload.type === 'Wholesale' ? Math.max(0, Number(payload.outstandingBalance || 0)) : 0
        };
        db.customers.push(newCust);
        responseData = newCust;
        break;

      case 'updateCustomer':
        const cIndex = db.customers.findIndex(c => c.id === payload.id);
        if (cIndex !== -1) {
          db.customers[cIndex] = {
            ...db.customers[cIndex],
            ...payload,
            fullName: payload.fullName !== undefined ? payload.fullName.trim() : db.customers[cIndex].fullName,
            phone: payload.phone !== undefined ? payload.phone : db.customers[cIndex].phone,
            address: payload.address !== undefined ? payload.address : db.customers[cIndex].address,
            type: payload.type !== undefined ? payload.type : db.customers[cIndex].type,
            businessName: payload.businessName !== undefined ? payload.businessName : db.customers[cIndex].businessName,
            creditLimit: payload.type === 'Wholesale' ? Math.max(0, Number(payload.creditLimit !== undefined ? payload.creditLimit : db.customers[cIndex].creditLimit || 0)) : 0,
            outstandingBalance: payload.type === 'Wholesale' ? Math.max(0, Number(payload.outstandingBalance !== undefined ? payload.outstandingBalance : db.customers[cIndex].outstandingBalance || 0)) : 0,
          };
          responseData = db.customers[cIndex];
        } else {
          throw new Error("Customer not found");
        }
        break;

      case 'deleteCustomer':
        const delCustIndex = db.customers.findIndex(c => c.id === payload.id);
        if (delCustIndex !== -1) {
          const removedCust = db.customers.splice(delCustIndex, 1)[0];
          responseData = removedCust;
        } else {
          throw new Error("Customer not found");
        }
        break;

      case 'recordCustomerPayment':
        const payingCust = db.customers.find(c => c.id === payload.customerId);
        if (!payingCust) {
          throw new Error("Customer not found");
        }
        const payAmount = Number(payload.amount || 0);
        if (payAmount <= 0) {
          throw new Error("Payment amount must be greater than zero.");
        }
        const currentBal = Number(payingCust.outstandingBalance || 0);
        payingCust.outstandingBalance = Math.max(0, currentBal - payAmount);
        responseData = {
          customer: payingCust,
          payment: {
            amount: payAmount,
            paymentMethod: payload.paymentMethod || "Bank Transfer",
            reference: payload.reference || `REF-${Date.now()}`,
            date: new Date().toISOString(),
            newBalance: payingCust.outstandingBalance
          }
        };
        break;

      case 'deleteSale':
      case 'voidSale': {
        const saleIndex = db.sales.findIndex(s => s.id === payload.id || s.invoiceNumber === payload.invoiceNumber || s.id === payload.invoiceId);
        if (saleIndex === -1) {
          throw new Error("Invoice not found");
        }
        const sale = db.sales[saleIndex];
        const actor = getActorInfo(payload, req);

        if (actor.actorRole !== "admin") {
          throw new Error("Unauthorized: Only system administrators are authorized to delete or void sales invoices.");
        }

        const reason = payload.reason?.trim() || "Administrative invoice deletion / order voided";
        const restoreInventory = payload.restoreStock !== false; // default true

        // 1. Restore product inventory if enabled
        if (restoreInventory && sale.items && sale.items.length > 0) {
          sale.items.forEach((item: any) => {
            const prod = db.products.find(p => p.id === item.productId);
            if (prod) {
              const prev = prod.currentStock;
              prod.currentStock += Number(item.quantity || 0);
              logAuditEvent({
                action: "STOCK_ADJUSTMENT",
                category: "INVENTORY",
                severity: "HIGH",
                actorId: actor.actorId,
                actorName: actor.actorName,
                actorEmail: actor.actorEmail,
                actorRole: actor.actorRole,
                ipAddress: actor.ipAddress,
                terminalStation: actor.terminalStation,
                targetEntityId: prod.id,
                targetEntityName: prod.name,
                description: `Inventory returned to tanks from deleted invoice ${sale.invoiceNumber} (+${item.quantity} ${prod.unit})`,
                reason: `Automatic stock reversal on invoice deletion: ${reason}`,
                previousValue: { currentStock: prev },
                newValue: { currentStock: prod.currentStock },
                diffSummary: `Restored +${item.quantity} ${prod.unit} back to stock (${prev} → ${prod.currentStock} ${prod.unit})`
              });
            }
          });
        }

        // 2. Reverse customer debt if applicable
        if (sale.customerId) {
          const cust = db.customers.find(c => c.id === sale.customerId);
          if (cust) {
            cust.totalPurchases = Math.max(0, (cust.totalPurchases || 0) - (sale.totalAmount || 0));
            if (sale.paymentMethod === "Credit" || sale.paymentStatus === "UNPAID") {
              cust.outstandingBalance = Math.max(0, (cust.outstandingBalance || 0) - (sale.totalAmount || 0));
            }
          }
        }

        // 3. Remove sale
        const deleted = db.sales.splice(saleIndex, 1)[0];

        // 4. Log CRITICAL audit event
        logAuditEvent({
          action: "INVOICE_DELETED",
          category: "INVOICES",
          severity: "CRITICAL",
          actorId: actor.actorId,
          actorName: actor.actorName,
          actorEmail: actor.actorEmail,
          actorRole: actor.actorRole,
          ipAddress: actor.ipAddress,
          terminalStation: actor.terminalStation,
          targetEntityId: deleted.id,
          targetEntityName: deleted.invoiceNumber,
          description: `Invoice ${deleted.invoiceNumber} permanently deleted for customer "${deleted.customerName || 'Walk-in Customer'}"`,
          reason: reason,
          previousValue: {
            invoiceNumber: deleted.invoiceNumber,
            totalAmount: deleted.totalAmount,
            customerName: deleted.customerName,
            items: deleted.items?.map((i: any) => `${i.productName} (${i.quantity} ${i.unit || ''})`),
            paymentMethod: deleted.paymentMethod,
            date: deleted.date
          },
          newValue: null,
          diffSummary: `Deleted invoice ${deleted.invoiceNumber} (Valued at ₦${Number(deleted.totalAmount).toLocaleString()}). Stock was ${restoreInventory ? 'restored to tanks' : 'not restored'}.`,
          metadata: {
            invoiceNumber: deleted.invoiceNumber,
            totalAmount: deleted.totalAmount,
            stockRestored: restoreInventory
          }
        });

        responseData = { success: true, deletedInvoiceNumber: deleted.invoiceNumber, id: deleted.id };
        break;
      }

      case 'addSale':
        const newSale = { 
          ...payload, 
          id: `S${Date.now()}`, 
          invoiceNumber: `INV-${Date.now()}`,
          date: new Date().toISOString()
        };
        
        // Deduct stock
        newSale.items.forEach((item: any) => {
          const product = db.products.find(p => p.id === item.productId);
          if (product) {
            product.currentStock -= item.quantity;
          }
        });

        // Update customer cumulative purchases & outstanding balance if on credit
        if (newSale.customerId) {
          const saleCust = db.customers.find(c => c.id === newSale.customerId);
          if (saleCust) {
            saleCust.totalPurchases = (saleCust.totalPurchases || 0) + (newSale.totalAmount || 0);
            if (newSale.paymentMethod === "Credit" || newSale.paymentStatus === "UNPAID") {
              saleCust.outstandingBalance = (saleCust.outstandingBalance || 0) + (newSale.totalAmount || 0);
            }
          }
        }
        
        db.sales.push(newSale);
        responseData = newSale;
        break;
        
      case 'addPurchase':
        const newPurchase = {
          ...payload,
          id: `PUR-${Date.now()}`,
          date: new Date().toISOString()
        };
        
        // Increase stock
        const product = db.products.find(p => p.id === payload.productId);
        if (product) {
          product.currentStock += payload.quantity;
        }
        
        db.purchases.push(newPurchase);
        responseData = newPurchase;
        break;

      case 'updateSettings': {
        const actor = getActorInfo(payload, req);
        const oldSettings = { ...db.settings };
        db.settings = {
          ...db.settings,
          ...payload
        };

        const changedKeys = Object.keys(payload).filter(k => payload[k] !== (oldSettings as any)[k] && k !== "_actor");
        if (changedKeys.length > 0) {
          const isBankChange = changedKeys.some(k => k.toLowerCase().includes("bank") || k.toLowerCase().includes("account"));
          logAuditEvent({
            action: isBankChange ? "BANK_DETAILS_UPDATED" : "SETTINGS_UPDATED",
            category: "SETTINGS",
            severity: isBankChange ? "HIGH" : "MEDIUM",
            actorId: actor.actorId,
            actorName: actor.actorName,
            actorEmail: actor.actorEmail,
            actorRole: actor.actorRole,
            ipAddress: actor.ipAddress,
            terminalStation: actor.terminalStation,
            targetEntityId: "SETTINGS",
            targetEntityName: isBankChange ? "Company Banking Details" : "Company Settings",
            description: isBankChange 
              ? `Company settlement bank details modified: ${changedKeys.join(", ")}`
              : `System settings updated: ${changedKeys.join(", ")}`,
            reason: payload.reason || "Administrative company profile maintenance",
            previousValue: oldSettings,
            newValue: db.settings,
            diffSummary: `Updated fields: ${changedKeys.map(k => `${k}: ${(oldSettings as any)[k] || 'None'} → ${payload[k]}`).join("; ")}`
          });
        }
        responseData = db.settings;
        break;
      }

      case 'getAuditLogs': {
        let logs = (db as any).auditLogs || [];
        if (payload.category && payload.category !== "ALL") {
          logs = logs.filter((l: any) => l.category === payload.category);
        }
        if (payload.action && payload.action !== "ALL") {
          logs = logs.filter((l: any) => l.action === payload.action);
        }
        if (payload.severity && payload.severity !== "ALL") {
          logs = logs.filter((l: any) => l.severity === payload.severity);
        }
        responseData = { auditLogs: logs };
        break;
      }

      default:
        throw new Error("Unknown action: " + action);
    }
    
    return res.json({ success: true, data: responseData });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});


// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
