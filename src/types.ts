export type UserRole = "admin" | "user";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status?: string;
  // Active user / session tracking
  isOnline?: boolean;
  lastLogin?: string;
  lastActiveAt?: string;
  lastLoginIp?: string;
  deviceInfo?: string;
  currentStation?: string;
  sessionId?: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  loginTime: string;
  lastActiveAt: string;
  deviceInfo?: string;
  ip?: string;
  station?: string;
  isOnline: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  type: string;
  salesType: "Retail" | "Wholesale";
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  openingStock: number;
  currentStock: number;
  minStock: number;
  status: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  type: "Retail" | "Wholesale";
  businessName?: string;
  totalPurchases: number;
  creditLimit?: number;
  outstandingBalance?: number;
  email?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  staffId: string;
  staffName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  // Delivery & Waybill fields
  waybillNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
}

export interface WaybillData {
  waybillNumber: string;
  invoiceNumber: string;
  date: string;
  deliveryDate?: string;
  customerId?: string;
  customerName: string;
  businessName?: string;
  customerPhone?: string;
  deliveryAddress: string;
  dispatchStation: string;
  staffName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  items: {
    productName: string;
    quantity: number;
    unit: string;
    remarks?: string;
  }[];
  deliveryNotes?: string;
}

export interface Purchase {
  id: string;
  date: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  recordedBy: string;
}

export interface Settings {
  businessName: string;
  rcNumber: string;
  stationAddress: string;
  officeAddress: string;
  phoneNumbers: string;
  email?: string;
  // Company Bank Details
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  bankBranch?: string;
  sortCode?: string;
  taxIdNumber?: string;
  paymentInstructions?: string;
  // Secondary / Alternative Bank Account (Optional)
  secondaryBankName?: string;
  secondaryAccountNumber?: string;
  secondaryAccountName?: string;
  // Google Sheets config
  googleSheetsWebAppUrl?: string;
}

export type AuditActionType =
  | "PRICE_CHANGE"
  | "STOCK_ADJUSTMENT"
  | "INVOICE_DELETED"
  | "INVOICE_VOIDED"
  | "PRODUCT_CREATED"
  | "PRODUCT_DELETED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "SETTINGS_UPDATED"
  | "PAYMENT_RECORDED";

export type AuditCategory =
  | "PRICING"
  | "INVENTORY"
  | "INVOICES"
  | "USERS"
  | "SETTINGS"
  | "FINANCE";

export type AuditSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AuditLog {
  id: string;
  timestamp: string; // ISO string
  action: AuditActionType;
  category: AuditCategory;
  severity: AuditSeverity;
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
}
