export type UserRole = "admin" | "user" | "cashier" | "manager";

export interface User {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  role: UserRole;
  status?: string;
  isOnline?: boolean;
  lastLogin?: string;
  lastActiveAt?: string;
  lastLoginIp?: string;
  deviceInfo?: string;
  currentStation?: string;
  sessionId?: string;
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
  stock?: number; // Optional alias to support components referencing p.stock
  minStock: number;
  status: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  staffId: string;
  staffName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
}