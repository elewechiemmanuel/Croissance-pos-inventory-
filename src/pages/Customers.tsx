import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import React, { useContext, useState, useEffect } from "react";
import { DataContext } from "../components/Layout";
import { Customer } from "../types";
import { 
  Plus, 
  Search, 
  UserCircle, 
  Building2, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  Edit2, 
  Trash2, 
  DollarSign, 
  ArrowDownRight, 
  X, 
  FileText,
  Phone,
  MapPin,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { formatCurrency } from "../lib/utils";

export default function Customers() {
  const context = useContext(DataContext);
  // Real-time Firestore customer list or Context fallback
  const [customers, setCustomers] = useState<Customer[]>(context?.customers || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "wholesale" | "debtors" | "retail">("all");
  
  // Modals state
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  // New Customer Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<"Retail" | "Wholesale">("Retail");
  const [businessName, setBusinessName] = useState("");
  const [creditLimit, setCreditLimit] = useState<string>("0");
  const [outstandingBalance, setOutstandingBalance] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Edit Customer Form State
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editType, setEditType] = useState<"Retail" | "Wholesale">("Retail");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editCreditLimit, setEditCreditLimit] = useState<string>("0");
  const [editOutstandingBalance, setEditOutstandingBalance] = useState<string>("0");
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  // -------------------------------------------------------------
  // FIREBASE REAL-TIME LISTENER
  // -------------------------------------------------------------
  useEffect(() => {
    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedCustomers: Customer[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Customer, "id">),
        }));
        setCustomers(fetchedCustomers);
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Statistics
  const totalCustomers = customers.length;
  const wholesaleCustomers = customers.filter((c: Customer) => c.type === "Wholesale");
  const retailCustomers = customers.filter((c: Customer) => c.type === "Retail");
  
  const totalOutstanding = wholesaleCustomers.reduce(
    (sum: number, c: Customer) => sum + Number(c.outstandingBalance || 0), 
    0
  );
  const totalCreditLimit = wholesaleCustomers.reduce(
    (sum: number, c: Customer) => sum + Number(c.creditLimit || 0), 
    0
  );
  const debtorsCount = wholesaleCustomers.filter(
    (c: Customer) => Number(c.outstandingBalance || 0) > 0
  ).length;

  // Filtered List
  const filteredCustomers = customers.filter((c: Customer) => {
    const matchesSearch = 
      (c.fullName && c.fullName.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (c.businessName && c.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "wholesale") return c.type === "Wholesale";
    if (activeTab === "retail") return c.type === "Retail";
    if (activeTab === "debtors") return Number(c.outstandingBalance || 0) > 0;
    return true;
  });

  const handleOpenAdd = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setType("Retail");
    setBusinessName("");
    setCreditLimit("0");
    setOutstandingBalance("0");
    setFormError("");
    setIsAdding(true);
  };

  // -------------------------------------------------------------
  // ADD CUSTOMER TO FIRESTORE
  // -------------------------------------------------------------
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    try {
      const parsedLimit = type === "Wholesale" ? Math.max(0, parseFloat(creditLimit) || 0) : 0;
      const parsedBalance = type === "Wholesale" ? Math.max(0, parseFloat(outstandingBalance) || 0) : 0;

      await addDoc(collection(db, "customers"), {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        type,
        businessName: type === "Wholesale" ? businessName.trim() : "",
        creditLimit: parsedLimit,
        outstandingBalance: parsedBalance,
        totalPurchases: 0,
        createdAt: serverTimestamp(),
      });

      if (context?.refreshData) await context.refreshData();
      setIsAdding(false);
    } catch (error: any) {
      setFormError(error.message || "Failed to add customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditFullName(customer.fullName || "");
    setEditPhone(customer.phone || "");
    setEditEmail(customer.email || "");
    setEditAddress(customer.address || "");
    setEditType(customer.type || "Retail");
    setEditBusinessName(customer.businessName || "");
    setEditCreditLimit(String(customer.creditLimit || 0));
    setEditOutstandingBalance(String(customer.outstandingBalance || 0));
    setEditError("");
  };

  // -------------------------------------------------------------
  // UPDATE CUSTOMER IN FIRESTORE
  // -------------------------------------------------------------
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditError("");
    setIsUpdating(true);
    try {
      const parsedLimit = editType === "Wholesale" ? Math.max(0, parseFloat(editCreditLimit) || 0) : 0;
      const parsedBalance = editType === "Wholesale" ? Math.max(0, parseFloat(editOutstandingBalance) || 0) : 0;

      const customerRef = doc(db, "customers", editingCustomer.id);
      await updateDoc(customerRef, {
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        type: editType,
        businessName: editType === "Wholesale" ? editBusinessName.trim() : "",
        creditLimit: parsedLimit,
        outstandingBalance: parsedBalance,
        updatedAt: serverTimestamp(),
      });

      if (context?.refreshData) await context.refreshData();
      setEditingCustomer(null);
    } catch (error: any) {
      setEditError(error.message || "Failed to update customer");
    } finally {
      setIsUpdating(false);
    }
  };

  // -------------------------------------------------------------
  // DELETE CUSTOMER FROM FIRESTORE
  // -------------------------------------------------------------
  const handleDeleteCustomer = async (customer: Customer) => {
    if (customer.id === "C1" || customer.id === "cust_walkin") {
      alert("The default Walk-in Customer account cannot be deleted.");
      return;
    }
    const balance = Number(customer.outstandingBalance || 0);
    const confirmMsg = balance > 0 
      ? `Warning: ${customer.fullName} currently has an outstanding balance of ${formatCurrency(balance)}. Are you sure you want to delete this customer record?`
      : `Are you sure you want to delete customer "${customer.fullName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDoc(doc(db, "customers", customer.id));
      if (context?.refreshData) await context.refreshData();
    } catch (err: any) {
      alert(err.message || "Failed to delete customer");
    }
  };

  const handleOpenPayment = (customer: Customer) => {
    setPaymentCustomer(customer);
    setPaymentAmount(String(customer.outstandingBalance || ""));
    setPaymentMethod("Bank Transfer");
    setPaymentReference(`TRF-${Date.now().toString().slice(-6)}`);
    setPaymentError("");
  };

  // -------------------------------------------------------------
  // RECORD CUSTOMER PAYMENT IN FIRESTORE
  // -------------------------------------------------------------
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    setPaymentError("");
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Please enter a valid payment amount greater than zero.");
      return;
    }
    setIsRecordingPayment(true);
    try {
      const newBalance = Math.max(0, Number(paymentCustomer.outstandingBalance || 0) - amount);

      // Update customer balance
      const customerRef = doc(db, "customers", paymentCustomer.id);
      await updateDoc(customerRef, {
        outstandingBalance: newBalance,
        updatedAt: serverTimestamp(),
      });

      // Log payment record transaction in payments collection
      await addDoc(collection(db, "customer_payments"), {
        customerId: paymentCustomer.id,
        customerName: paymentCustomer.fullName,
        amount,
        paymentMethod,
        reference: paymentReference,
        createdAt: serverTimestamp(),
      });

      if (context?.refreshData) await context.refreshData();
      setPaymentCustomer(null);
    } catch (err: any) {
      setPaymentError(err.message || "Failed to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-2xs border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Customer Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage retail buyers, wholesale distributors, credit facilities, and outstanding debts.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Register New Customer</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customers */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
              <UserCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{totalCustomers}</span>
            <span className="text-xs text-gray-500">({wholesaleCustomers.length} wholesale)</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{retailCustomers.length} registered retail clients</p>
        </div>

        {/* Card 2: Total Outstanding Balance */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding Balances</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              totalOutstanding > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold tracking-tight ${
              totalOutstanding > 0 ? "text-red-700" : "text-emerald-700"
            }`}>
              {formatCurrency(totalOutstanding)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {debtorsCount > 0 ? `${debtorsCount} wholesale client(s) with pending balance` : "All accounts cleared"}
          </p>
        </div>

        {/* Card 3: Total Credit Limit Extended */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit Limits Extended</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-800 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-purple-950 tracking-tight">
              {formatCurrency(totalCreditLimit)}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Authorized wholesale bulk purchase limits</p>
        </div>

        {/* Card 4: Net Available Credit Buffer */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Credit Buffer</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              {formatCurrency(Math.max(0, totalCreditLimit - totalOutstanding))}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {totalCreditLimit > 0 
              ? `${Math.round(((totalCreditLimit - totalOutstanding) / totalCreditLimit) * 100)}% available buffer` 
              : "No credit lines active"}
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden">
        {/* Search & Tabs */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gray-50/50">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "all" 
                  ? "bg-blue-900 text-white shadow-2xs" 
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              All Accounts ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab("wholesale")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "wholesale" 
                  ? "bg-purple-900 text-white shadow-2xs" 
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              Wholesale Clients ({wholesaleCustomers.length})
            </button>
            <button
              onClick={() => setActiveTab("debtors")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === "debtors" 
                  ? "bg-red-800 text-white shadow-2xs" 
                  : "bg-white text-red-700 border border-red-200 hover:bg-red-50"
              }`}
            >
              <span>Debtors with Balance</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "debtors" ? "bg-white text-red-800" : "bg-red-100 text-red-800"
              }`}>
                {debtorsCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("retail")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "retail" 
                  ? "bg-blue-800 text-white shadow-2xs" 
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              Retail ({retailCustomers.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px] md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by customer, company, phone, location..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
            />
          </div>
        </div>
        
        {/* Customers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Customer &amp; Business</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Contact &amp; Location</th>
                <th className="px-4 py-3.5 text-right">Credit Limit (₦)</th>
                <th className="px-4 py-3.5 text-right">Outstanding Balance (₦)</th>
                <th className="px-4 py-3.5 text-center">Credit Facility Status</th>
                <th className="px-4 py-3.5 text-right">Cumulative Volume</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <UserCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">No customers found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria or register a new customer.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c: Customer) => {
                  const isWholesale = c.type === "Wholesale";
                  const limit = Number(c.creditLimit || 0);
                  const balance = Number(c.outstandingBalance || 0);
                  const availableCredit = limit - balance;
                  const utilPercent = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0;
                  const isOverLimit = balance > limit && limit > 0;

                  return (
                    <tr key={c.id} className="hover:bg-blue-50/20 transition-colors">
                      {/* Customer Name & Business */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isWholesale ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {isWholesale ? <Building2 className="w-4 h-4" /> : <UserCircle className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-tight">{c.fullName}</p>
                            {c.businessName && (
                              <p className="text-xs text-purple-700 font-semibold mt-0.5 flex items-center gap-1">
                                <span>{c.businessName}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer Type */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                          isWholesale ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {c.type}
                        </span>
                      </td>

                      {/* Contact & Location */}
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        <div className="space-y-0.5">
                          <p className="font-medium text-gray-800">{c.phone || "No phone recorded"}</p>
                          {c.address && (
                            <p className="text-[11px] text-gray-400 truncate max-w-xs" title={c.address}>
                              {c.address}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Credit Limit */}
                      <td className="px-4 py-3.5 text-right font-bold text-gray-800">
                        {isWholesale ? (
                          <div className="text-right">
                            <span className="text-gray-900 font-bold">{formatCurrency(limit)}</span>
                            {limit === 0 && (
                              <p className="text-[10px] text-gray-400 font-normal">Prepaid / No limit</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">N/A (Prepaid)</span>
                        )}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="px-4 py-3.5 text-right">
                        {isWholesale ? (
                          <div className="text-right">
                            {balance > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                {formatCurrency(balance)}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg text-xs">
                                ₦0.00 (Cleared)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </td>

                      {/* Credit Utilization Status */}
                      <td className="px-4 py-3.5">
                        {isWholesale && limit > 0 ? (
                          <div className="w-36 mx-auto space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold">
                              <span className={isOverLimit ? "text-red-700 font-bold" : "text-gray-500"}>
                                {isOverLimit ? "Exceeded" : `${utilPercent}% Used`}
                              </span>
                              <span className={availableCredit >= 0 ? "text-emerald-700" : "text-red-600 font-bold"}>
                                {availableCredit >= 0 
                                  ? `${formatCurrency(availableCredit)} free` 
                                  : `-${formatCurrency(Math.abs(availableCredit))}`
                                }
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  isOverLimit || utilPercent > 85 
                                    ? "bg-red-600" 
                                    : utilPercent > 60 
                                    ? "bg-amber-500" 
                                    : "bg-emerald-500"
                                }`} 
                                style={{ width: `${Math.min(100, isOverLimit ? 100 : utilPercent)}%` }} 
                              />
                            </div>
                          </div>
                        ) : isWholesale ? (
                          <div className="text-center text-[11px] text-gray-400">Zero Credit Facility</div>
                        ) : (
                          <div className="text-center text-[11px] text-gray-400">Retail Client</div>
                        )}
                      </td>

                      {/* Cumulative Total Purchases */}
                      <td className="px-4 py-3.5 text-right font-bold text-blue-950">
                        {formatCurrency(c.totalPurchases || 0)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Record Payment Button */}
                          {isWholesale && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(c)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                balance > 0
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                              }`}
                              title={balance > 0 ? "Record Debt Settlement / Payment" : "Record Advance / Payment"}
                            >
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              <span>{balance > 0 ? "Pay Debt" : "Pay"}</span>
                            </button>
                          )}

                          {/* Edit Customer */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-gray-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit customer details & credit terms"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Customer */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(c)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: ADD NEW CUSTOMER --- */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-blue-950 text-white">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Register New Customer</h3>
              </div>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-blue-900 rounded-full transition-colors text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name / Contact Person *
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    placeholder="e.g. Alhaji Musa Bello"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input 
                    required 
                    type="tel" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="e.g. 08012345678"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Customer Account Type *
                  </label>
                  <select 
                    value={type} 
                    onChange={e => setType(e.target.value as any)} 
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
                  >
                    <option value="Retail">Retail (Instant Payment / Cash &amp; POS)</option>
                    <option value="Wholesale">Wholesale (Bulk Client / Credit Facility Eligible)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Email Address (Optional)
                  </label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="e.g. client@company.com"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600" 
                  />
                </div>
              </div>

              {type === "Wholesale" && (
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-700" />
                    <h4 className="font-bold text-xs text-purple-900 uppercase tracking-wider">Wholesale Business &amp; Credit Terms</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Business/Company Name</label>
                      <input 
                        type="text" 
                        value={businessName} 
                        onChange={e => setBusinessName(e.target.value)} 
                        placeholder="e.g. Bello &amp; Sons Ltd"
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Credit Limit (₦)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={creditLimit} 
                        onChange={e => setCreditLimit(e.target.value)} 
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 font-bold" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Opening Debt Balance (₦)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={outstandingBalance} 
                        onChange={e => setOutstandingBalance(e.target.value)} 
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 font-bold text-red-700" 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Physical Address / Location
                </label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="e.g. Suite 4, Central Market, Kano"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600" 
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)} 
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="px-5 py-2 text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Registering..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT CUSTOMER --- */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-blue-950 text-white">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-base">Edit Customer: {editingCustomer.fullName}</h3>
              </div>
              <button 
                onClick={() => setEditingCustomer(null)}
                className="p-1 hover:bg-blue-900 rounded-full transition-colors text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="p-6 overflow-y-auto space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name / Contact Person *
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={editFullName} 
                    onChange={e => setEditFullName(e.target.value)} 
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input 
                    required 
                    type="tel" 
                    value={editPhone} 
                    onChange={e => setEditPhone(e.target.value)} 
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Customer Account Type *
                  </label>
                  <select 
                    value={editType} 
                    onChange={e => setEditType(e.target.value as any)} 
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    value={editEmail} 
                    onChange={e => setEditEmail(e.target.value)} 
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600" 
                  />
                </div>
              </div>

              {editType === "Wholesale" && (
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-700" />
                    <h4 className="font-bold text-xs text-purple-900 uppercase tracking-wider">Wholesale Terms &amp; Debt Settings</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Business/Company Name</label>
                      <input 
                        type="text" 
                        value={editBusinessName} 
                        onChange={e => setEditBusinessName(e.target.value)} 
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Credit Limit (₦)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={editCreditLimit} 
                        onChange={e => setEditCreditLimit(e.target.value)} 
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 font-bold" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Outstanding Balance (₦)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={editOutstandingBalance} 
                        onChange={e => setEditOutstandingBalance(e.target.value)} 
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 font-bold text-red-700" 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Physical Address
                </label>
                <input 
                  type="text" 
                  value={editAddress} 
                  onChange={e => setEditAddress(e.target.value)} 
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600" 
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingCustomer(null)} 
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating} 
                  className="px-5 py-2 text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? "Updating..." : "Update Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: RECORD DEBT PAYMENT --- */}
      {paymentCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-emerald-800 text-white">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">Record Payment / Settlement</h3>
              </div>
              <button 
                onClick={() => setPaymentCustomer(null)}
                className="p-1 hover:bg-emerald-700 rounded-full transition-colors text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Customer Account</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">{paymentCustomer.fullName}</p>
                {paymentCustomer.businessName && (
                  <p className="text-xs text-gray-600 font-medium">{paymentCustomer.businessName}</p>
                )}
                <div className="mt-2 pt-2 border-t border-emerald-200/60 flex justify-between items-center text-xs">
                  <span className="text-gray-600">Current Outstanding Debt:</span>
                  <span className="font-bold text-red-700 text-sm">
                    {formatCurrency(Number(paymentCustomer.outstandingBalance || 0))}
                  </span>
                </div>
              </div>

              {paymentError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Payment Amount (₦) *
                </label>
                <input 
                  required 
                  type="number" 
                  step="0.01"
                  min="1"
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(e.target.value)} 
                  className="w-full px-3 py-2 text-base font-bold text-emerald-950 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Payment Method *
                </label>
                <select 
                  value={paymentMethod} 
                  onChange={e => setPaymentMethod(e.target.value)} 
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 font-medium cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="POS / Card">POS / Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Reference / Receipt No.
                </label>
                <input 
                  type="text" 
                  value={paymentReference} 
                  onChange={e => setPaymentReference(e.target.value)} 
                  placeholder="e.g. TRF-123456"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600" 
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setPaymentCustomer(null)} 
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isRecordingPayment} 
                  className="px-5 py-2 text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isRecordingPayment ? "Processing..." : "Confirm & Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}