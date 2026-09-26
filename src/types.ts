export interface Product {
  id: string;
  _id?: string;
  name: string;
  category: string;
  sellingPrice: number;
  retailPrice?: number;
  wholesalePrice?: number;
  currentStock: number;
  stock?: number;
  minStockLevel?: number;
  lowStockThreshold?: number;
  unit?: string;
}

export interface Purchase {
  id: string;
  _id?: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  unitCost?: number;
  totalCost: number;
  supplierName?: string;
  date: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  _id?: string;
  name: string;
  fullName?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  address?: string;
  outstandingBalance?: number;
}

export type UserRole = 'Admin' | 'Cashier' | 'Manager' | 'Staff' | string;

export interface ActiveSession {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  lastActiveAt?: string;
}

export interface User {
  id: string;
  _id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: UserRole;
  status?: string;
  isOnline?: boolean;
  lastActiveAt?: string;
  lastLogin?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
  priceTier?: string;
}

export interface Sale {
  id: string;
  _id?: string;
  invoiceNumber: string;
  date: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  staffId: string;
  staffName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress?: string;
  customerAddress?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  waybillNumber?: string;
  deliveryNotes?: string;
}

export interface WaybillItem {
  productId?: string;
  name?: string;
  productName?: string;
  quantity: number;
  unit?: string;
  price?: number;
  unitPrice?: number;
  remarks?: string;
}

export interface WaybillData {
  id: string;
  _id?: string;
  saleId?: string;
  waybillNumber: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  destination?: string;
  deliveryAddress?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryNotes?: string;
  dispatchStation?: string;
  createdAt: string;
  date?: string;
  deliveryDate?: string;
  status?: string;
  items: WaybillItem[];
  notes?: string;
}

export interface Waybill extends WaybillData {}

export interface Settings {
  businessName?: string;
  rcNumber?: string;
  stationAddress?: string;
  officeAddress?: string;
  phoneNumbers?: string;
  email?: string;
  taxIdentificationNumber?: string;
  receiptFooter?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  [key: string]: any;
}

export type AuditActionType = 
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' 
  | 'PRICE_CHANGE' | 'STOCK_ADJUSTMENT' | 'INVOICE_DELETED' | 'BANK_DETAILS_UPDATED' 
  | string;

export type AuditCategory = 
  | 'PRODUCT' | 'SALE' | 'USER' | 'SETTINGS' | 'AUTH' 
  | 'PRICING' | 'INVENTORY' | 'INVOICES' | 'USERS'
  | string;

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO' | 'WARNING' | 'ERROR' | string;

export interface AuditLog {
  id: string;
  _id?: string;
  action: AuditActionType;
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
  details?: string;
  
  userId?: string;
  userName?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  
  target?: string;
  targetName?: string;
  targetEntityName?: string;
  targetEntityId?: string;
  
  ipAddress?: string;
  terminalStation?: string;
  reason?: string;
  diffSummary?: string;
  previousValue?: any;
  newValue?: any;
  
  timestamp: string;
  createdAt?: string;
}