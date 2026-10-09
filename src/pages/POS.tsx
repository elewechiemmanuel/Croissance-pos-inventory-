import React, { useState, useContext, useMemo } from "react";
import { DataContext } from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import { apiCall } from "../lib/api";
import { Product, Customer, SaleItem, Sale } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import Receipt from "../components/Receipt";
import { printReceipt } from "../lib/receiptPrinter";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  UserCheck, 
  AlertCircle, 
  Search, 
  Printer,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  RotateCcw,
  AlertTriangle
} from "lucide-react";

export default function POS() {
  const { products = [], customers = [], settings = {}, sales = [], refreshData } = useContext(DataContext) as any;
  const { user } = useAuth();

  // Set default customer to Walk-in Customer
  const defaultWalkIn = customers.find((c: any) => c.fullName?.toLowerCase().includes("walk-in") || c.name?.toLowerCase().includes("walk-in")) || { id: "cust_walkin", fullName: "Walk-in Customer", name: "Walk-in Customer", type: "Retail" };
  const [selectedCustomer, setSelectedCustomer] = useState<any>(defaultWalkIn);
  
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [cardQuantities, setCardQuantities] = useState<Record<string, string>>({});
  
  // Confirmation Modal State for Printing/Checkout
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);

  // Modal / Drawer state for viewing transactions tabs
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactionTabFilter, setTransactionTabFilter] = useState<"all" | "completed" | "pending">("all");

  const DEFAULT_RETAIL_PRICE = 1250;
  const DEFAULT_WHOLESALE_PRICE = 1130;
  const DEFAULT_STOCK_BALANCE = 10007.61;
   
  const AGO_RETAIL_PRICE = 2050;
  const AGO_WHOLESALE_PRICE = 2000;
  const AGO_DEFAULT_STOCK = 2690;

  const combinedProducts = useMemo(() => {
    const virtualAgoProduct: Product = {
      id: "prod_ago_guaranteed_default",
      name: "AGO (Diesel)",
      category: "Fuel",
      currentStock: AGO_DEFAULT_STOCK,
      minStock: 500,
      unit: "L",
      status: "Active",
      sellingPrice: AGO_RETAIL_PRICE,
      wholesalePrice: AGO_WHOLESALE_PRICE
    };

    const hasAgo = products.some((p: Product) => 
      p.name?.toUpperCase().includes("AGO") || p.category?.toUpperCase().includes("AGO")
    );

    if (!hasAgo) {
      return [virtualAgoProduct, ...products];
    }
    return products;
  }, [products]);

  const categories: string[] = useMemo(() => {
    const cats = Array.from(new Set(combinedProducts.map((p: Product) => p.category).filter(Boolean))) as string[];
    return ["ALL", ...cats];
  }, [combinedProducts]);

  const visibleProducts = useMemo(() => {
    return combinedProducts.filter((p: Product) => {
      if (p.status !== "Active") return false;
      const matchesCategory = selectedCategory === "ALL" || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = !searchTerm || 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [combinedProducts, selectedCategory, searchTerm]);

  const getProductCardQty = (productId: string): number => {
    const val = cardQuantities[productId];
    if (!val || isNaN(Number(val)) || Number(val) <= 0) return 1;
    return Number(val);
  };

  const handleCardQtyChange = (productId: string, val: string) => {
    setCardQuantities(prev => ({ ...prev, [productId]: val }));
  };

  const addToCart = (product: Product, isWholesale: boolean, customQty?: number) => {
    setError("");
     
    const isAgo = product.name?.toUpperCase().includes("AGO") || product.category?.toUpperCase().includes("AGO");
    const unitPrice = isWholesale 
      ? (product.wholesalePrice ?? (isAgo ? AGO_WHOLESALE_PRICE : DEFAULT_WHOLESALE_PRICE))
      : (product.sellingPrice ?? product.retailPrice ?? (isAgo ? AGO_RETAIL_PRICE : DEFAULT_RETAIL_PRICE));
     
    const qtyToAdd = customQty !== undefined ? customQty : getProductCardQty(product.id);
    const availableStock = product.currentStock ?? (isAgo ? AGO_DEFAULT_STOCK : DEFAULT_STOCK_BALANCE);

    if (qtyToAdd <= 0) {
      setError("Please enter a valid quantity greater than 0.");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.unitPrice === unitPrice);
      if (existing) {
        const nextQty = existing.quantity + qtyToAdd;
        if (nextQty > availableStock) {
          setError(`Cannot add ${qtyToAdd}. Only ${availableStock} ${product.unit || 'L'} available in stock.`);
          return prev;
        }
        return prev.map(item => 
          item.productId === product.id && item.unitPrice === unitPrice
            ? { ...item, quantity: nextQty, total: nextQty * unitPrice }
            : item
        );
      }
       
      if (availableStock < qtyToAdd) {
        setError(`Insufficient stock! Only ${availableStock} ${product.unit || 'L'} available.`);
        return prev;
      }

      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: qtyToAdd,
        unitPrice,
        total: qtyToAdd * unitPrice
      }];
    });

    setCardQuantities(prev => ({ ...prev, [product.id]: "1" }));
  };

  const handleCartQuantityChange = (index: number, val: string) => {
    setError("");
    const parsed = parseFloat(val);
     
    if (val === "" || isNaN(parsed)) {
      setCart(prev => {
        const newCart = [...prev];
        newCart[index] = { ...newCart[index], quantity: 0, total: 0 };
        return newCart;
      });
      return;
    }

    const item = cart[index];
    const product = combinedProducts.find((p: Product) => p.id === item.productId);
    const isAgo = product?.name?.toUpperCase().includes("AGO") || product?.category?.toUpperCase().includes("AGO");
    const availableStock = product?.currentStock ?? (isAgo ? AGO_DEFAULT_STOCK : DEFAULT_STOCK_BALANCE);

    if (product && parsed > availableStock) {
      setError(`Cannot exceed available stock of ${availableStock} ${product.unit || 'L'}.`);
      setCart(prev => {
        const newCart = [...prev];
        newCart[index] = {
          ...item,
          quantity: availableStock,
          total: availableStock * item.unitPrice
        };
        return newCart;
      });
      return;
    }

    setCart(prev => {
      const newCart = [...prev];
      newCart[index] = {
        ...item,
        quantity: parsed,
        total: Math.round(parsed * item.unitPrice * 100) / 100
      };
      return newCart;
    });
  };

  const handleCartQuantityBlur = (index: number) => {
    setCart(prev => {
      const item = prev[index];
      if (!item || item.quantity <= 0) {
        const newCart = [...prev];
        newCart[index] = { ...item, quantity: 1, total: item.unitPrice };
        return newCart;
      }
      return prev;
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setError("");
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[index];
      const product = combinedProducts.find((p: Product) => p.id === item.productId);
      const isAgo = product?.name?.toUpperCase().includes("AGO") || product?.category?.toUpperCase().includes("AGO");
      const availableStock = product?.currentStock ?? (isAgo ? AGO_DEFAULT_STOCK : DEFAULT_STOCK_BALANCE);
       
      const newQuantity = Math.max(0, (item.quantity || 0) + delta);
       
      if (newQuantity <= 0) {
        return newCart.filter((_, i) => i !== index);
      }
       
      if (product && newQuantity > availableStock) {
        setError(`Cannot exceed available stock (${availableStock} ${product.unit || 'L'}).`);
        return newCart;
      }

      newCart[index] = {
        ...item,
        quantity: newQuantity,
        total: Math.round(newQuantity * item.unitPrice * 100) / 100
      };
      return newCart;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (cart.length > 0) {
      setCart([]);
      setError("");
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.total || 0), 0);
  const total = Math.max(0, subtotal - discount);

  const lastCompletedSale = useMemo(() => {
    const completedList = (sales as Sale[]).filter(s => {
      const st = (s.paymentStatus || "").trim().toLowerCase();
      return st === "completed" || st === "success";
    });
    if (completedList.length === 0) return sales.length > 0 ? sales[sales.length - 1] : null;
    return completedList.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
  }, [sales]);

  const handlePreCheckoutCheck = () => {
    if (cart.length === 0) return;

    const hasZeroQty = cart.some(item => !item.quantity || item.quantity <= 0);
    if (hasZeroQty) {
      setError("Please ensure all items have a valid quantity greater than 0.");
      return;
    }

    setError("");
    setShowPrintConfirmModal(true); // Open the Yes/No confirmation prompt before printing
  };

  const handleExecuteCheckout = async () => {
    setShowPrintConfirmModal(false);
    setIsProcessing(true);
    setError("");

    try {
      const customerName = selectedCustomer.fullName || selectedCustomer.name || "Walk-in Customer";
      
      // Save directly with "Completed" status upon confirmed print execution
      const initialSalePayload = {
        customerId: selectedCustomer.id || "cust_walkin",
        customerName,
        staffId: user?.id,
        staffName: user?.fullName,
        items: cart,
        subtotal,
        discount,
        totalAmount: total,
        paymentMethod,
        paymentStatus: "Completed" 
      };

      const savedSale = await apiCall("addSale", initialSalePayload);

      for (const item of cart) {
        const targetProduct = combinedProducts.find((p: Product) => p.id === item.productId);
        if (targetProduct && targetProduct.id !== "prod_ago_guaranteed_default") {
          const isAgo = targetProduct.name?.toUpperCase().includes("AGO") || targetProduct.category?.toUpperCase().includes("AGO");
          const currentStockVal = targetProduct.currentStock ?? (isAgo ? AGO_DEFAULT_STOCK : DEFAULT_STOCK_BALANCE);
          const updatedStock = Math.max(0, currentStockVal - item.quantity);
          await apiCall("updateProduct", {
            id: targetProduct.id,
            currentStock: updatedStock
          }).catch(err => console.warn("Stock depletion sync error:", err));
        }
      }

      setCart([]);
      setDiscount(0);
      await refreshData();

      try {
        await printReceipt(savedSale, settings, "thermal80");
        const updatedSale = { ...savedSale, paymentStatus: "Completed" };
        await apiCall("updateSale", updatedSale).catch(() => {});
        await refreshData();
        setCompletedSale(updatedSale);
      } catch (printErr) {
        console.warn("Printer failed:", printErr);
        // Fallback flag only if physical printer hardware explicitly throws an exception
        const unprintedSale = { ...savedSale, paymentStatus: "Pending" };
        await apiCall("updateSale", unprintedSale).catch(() => {});
        await refreshData();
        setError("Receipt printer failed! Transaction saved as pending/unprinted.");
        setCompletedSale(unprintedSale);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process sale.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreTransaction = async (tx: Sale) => {
    if (user?.role !== "admin") {
      alert("Unauthorized: Only administrators can restore transactions.");
      return;
    }

    if (!window.confirm(`Are you sure you want to restore invoice ${tx.invoiceNumber}? This will return items back to stock and cancel the transaction.`)) {
      return;
    }

    try {
      if (tx.items && Array.isArray(tx.items)) {
        for (const item of tx.items) {
          const targetProduct = combinedProducts.find((p: Product) => p.id === item.productId);
          if (targetProduct && targetProduct.id !== "prod_ago_guaranteed_default") {
            const isAgo = targetProduct.name?.toUpperCase().includes("AGO") || targetProduct.category?.toUpperCase().includes("AGO");
            const currentStockVal = targetProduct.currentStock ?? (isAgo ? AGO_DEFAULT_STOCK : DEFAULT_STOCK_BALANCE);
            const restoredStock = currentStockVal + item.quantity;
            await apiCall("updateProduct", {
              id: targetProduct.id,
              currentStock: restoredStock
            });
          }
        }
      }

      await apiCall("updateSale", {
        ...tx,
        paymentStatus: "Restored",
        status: "Cancelled"
      });

      await refreshData();
      alert("Transaction restored successfully and stock updated.");
    } catch (err: any) {
      alert(err.message || "Failed to restore transaction.");
    }
  };

  const filteredTransactions = useMemo(() => {
    return (sales as Sale[]).filter(s => {
      const status = (s.paymentStatus || "").trim().toLowerCase();
      const isCompleted = status === "completed" || status === "success";
      const isPendingOrFailed = status === "pending" || status === "failed" || status === "" || !s.paymentStatus;

      if (transactionTabFilter === "completed") return isCompleted;
      if (transactionTabFilter === "pending") return isPendingOrFailed && status !== "restored";
      return status !== "restored";
    }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [sales, transactionTabFilter]);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col lg:flex-row gap-5 -m-4 md:-m-8 p-3 md:p-6 bg-gray-50">
      {/* Left Panel: Products & Selection */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:px-4 sm:py-2.5 rounded-xl shadow-2xs border border-gray-100">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-blue-950 tracking-tight">Point of Sale</h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
              {user?.role === "admin" ? "Admin Mode" : "Cashier Mode"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lastCompletedSale && (
              <button
                type="button"
                onClick={() => setCompletedSale(lastCompletedSale)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Reprint Last Receipt</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTransactionsModal(true)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Transactions History</span>
            </button>
          </div>
        </div>
         
        {/* Customer Selection & Search */}
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-gray-100 flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
              <UserCheck className="text-blue-600 shrink-0 w-4 h-4" />
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Customer:</span>
              <select 
                className="w-full bg-transparent outline-none font-medium text-gray-800 text-sm cursor-pointer"
                value={selectedCustomer.id}
                onChange={(e) => {
                  const cust = customers.find((c: any) => c.id === e.target.value) || defaultWalkIn;
                  setSelectedCustomer(cust);
                  if ((cust?.type || cust?.pricingTier) !== "Wholesale" && paymentMethod === "Credit") {
                    setPaymentMethod("Cash");
                  }
                }}
            >
              {customers.map((c: any) => {
                const displayName = c.fullName || c.name || "Unnamed Customer";
                const displayType = c.type || c.pricingTier || "";
                return (
                  <option key={c.id} value={c.id}>
                    {displayName} {displayType === 'Wholesale' ? `(Wholesale)` : displayType ? `(${displayType})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search AGO, LPG, products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>
      </div>

      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-blue-900 text-white shadow-2xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {cat === "ALL" ? "All Products" : cat}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      <div className="flex-1 bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-gray-100 overflow-y-auto">
        {visibleProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
            <p className="font-medium text-sm">No products found matching filters.</p>
            <button 
              onClick={() => { setSearchTerm(""); setSelectedCategory("ALL"); }}
              className="mt-2 text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibleProducts.map((product: Product) => {
            const cardQty = cardQuantities[product.id] ?? "1";
            const isAgo = product.name?.toUpperCase().includes("AGO") || product.category?.toUpperCase().includes("AGO");
            const stockVal = product.currentStock ?? (isAgo ? AGO_DEFAULT_STOCK : DEFAULT_STOCK_BALANCE);
            const isOutOfStock = stockVal <= 0;
             
            const activeRetailPrice = product.sellingPrice ?? product.retailPrice ?? (isAgo ? AGO_RETAIL_PRICE : DEFAULT_RETAIL_PRICE);
            const activeWholesalePrice = product.wholesalePrice ?? (isAgo ? AGO_WHOLESALE_PRICE : DEFAULT_WHOLESALE_PRICE);

            return (
              <div key={product.id} className="border border-gray-200 rounded-xl p-3.5 hover:border-blue-400 transition-colors flex flex-col bg-white shadow-2xs">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{product.name}</h3>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{product.category}</span>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-1 ${stockVal > (product.minStock || 10) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {stockVal} {product.unit || 'L'} left
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-500 font-medium">Quantity:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={cardQty}
                    disabled={isOutOfStock}
                    onChange={(e) => handleCardQtyChange(product.id, e.target.value)}
                    placeholder="1"
                    className="w-16 px-2 py-1 text-center font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                  />
                  <span className="text-gray-400 text-[11px] font-medium">{product.unit || 'L'}</span>
                </div>
              </div>
                
              <div className="mt-3 pt-2 grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => addToCart(product, false)}
                  className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed text-blue-900 px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
                >
                  <span className="text-[10px] text-blue-600 uppercase font-medium">Retail</span>
                  <span className="font-bold">{formatCurrency(activeRetailPrice)}</span>
                </button>

                <button 
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => addToCart(product, true)}
                  className="flex flex-col items-center justify-center bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed text-amber-900 px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
                >
                  <span className="text-[10px] text-amber-600 uppercase font-medium">Wholesale</span>
                  <span className="font-bold">{formatCurrency(activeWholesalePrice)}</span>
                </button>
              </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
      </div>

      {/* Right Panel: Cart */}
      <div className="w-full lg:w-96 bg-white rounded-xl shadow-2xs border border-gray-100 flex flex-col h-[520px] lg:h-full shrink-0">
      <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-blue-950 text-white rounded-t-xl">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-amber-400" />
          <h2 className="font-bold text-sm">Current Order Cart</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </span>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] text-blue-200 hover:text-white underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="m-3 mb-0 p-2.5 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2 border border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
            <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="text-xs text-gray-400 mt-1">Select products to begin sale</p>
          </div>
        ) : (
          cart.map((item, index) => (
            <div key={index} className="flex flex-col gap-1.5 pb-3 border-b border-gray-100 last:border-0">
            <div className="flex justify-between items-start">
              <span className="font-bold text-xs text-gray-900 leading-tight">{item.productName}</span>
              <span className="font-bold text-xs text-blue-950">{formatCurrency(item.total)}</span>
            </div>
             
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span className="text-[11px]">@{formatCurrency(item.unitPrice)}</span>
               
              <div className="flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={() => updateQuantity(index, -1)} 
                  className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                 
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={item.quantity === 0 ? "" : item.quantity}
                  onChange={(e) => handleCartQuantityChange(index, e.target.value)}
                  onBlur={() => handleCartQuantityBlur(index)}
                  className="w-16 px-1.5 py-0.5 text-center font-bold text-xs text-gray-900 bg-white border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-600"
                />

                <button 
                  type="button"
                  onClick={() => updateQuantity(index, 1)} 
                  className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>

                <button 
                  type="button"
                  onClick={() => removeFromCart(index)} 
                  className="p-1 ml-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout */}
      <div className="p-3.5 border-t border-gray-100 bg-gray-50/80 space-y-2.5 rounded-b-xl">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Subtotal</span>
          <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
        </div>
         
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Discount</span>
          <input 
            type="number" 
            value={discount === 0 ? "" : discount}
            onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
            className="w-20 text-right px-2 py-0.5 text-xs bg-white border border-gray-200 rounded outline-none"
            placeholder="0.00"
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Payment</span>
          <select 
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="px-2 py-0.5 border border-gray-200 rounded text-xs outline-none bg-white font-medium cursor-pointer"
          >
            <option>Cash</option>
            <option>POS Terminal</option>
            <option>Bank Transfer</option>
          </select>
        </div>

        <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
          <span className="font-bold text-sm text-gray-800">Total Payable</span>
          <span className="font-bold text-xl text-blue-950">{formatCurrency(total)}</span>
        </div>

        <div className="pt-1 grid grid-cols-1 gap-2">
          <button 
            type="button"
            onClick={handlePreCheckoutCheck}
            disabled={cart.length === 0 || isProcessing}
            className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2 text-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>{isProcessing ? "Processing..." : "Confirm & Print Receipt"}</span>
          </button>
        </div>
      </div>
      </div>

      {/* PRINT CONFIRMATION MODAL PROMPT (Are you sure you want to print this receipt?) */}
      {showPrintConfirmModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Are you sure you want to print this receipt?</h3>
              <p className="text-xs text-gray-500 mt-1">This will finalize the order, deduct inventory, and execute printing immediately.</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintConfirmModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                No (Cancel)
              </button>
              <button
                type="button"
                onClick={handleExecuteCheckout}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                Yes, Print & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactionsModal && (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <div className="p-4 bg-blue-950 text-white flex justify-between items-center">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>POS Transactions History</span>
            </h3>
            <button 
              onClick={() => setShowTransactionsModal(false)}
              className="text-gray-300 hover:text-white font-bold text-lg px-2 cursor-pointer"
            >
              &times;
            </button>
          </div>

          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTransactionTabFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${transactionTabFilter === "all" ? "bg-blue-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}
              >
                All Transactions
              </button>
              <button
                type="button"
                onClick={() => setTransactionTabFilter("completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${transactionTabFilter === "completed" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}
              >
                Successful
              </button>
              <button
                type="button"
                onClick={() => setTransactionTabFilter("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${transactionTabFilter === "pending" ? "bg-amber-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}
              >
                Pending / Unprinted
              </button>
            </div>
            <span className="text-xs text-gray-500 font-semibold">{filteredTransactions.length} records found</span>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm font-medium">No transaction history matching the filter.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase font-semibold border-b border-gray-200">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((tx: Sale) => {
                    const isSuccess = (tx.paymentStatus || "").trim().toLowerCase() === "completed" || (tx.paymentStatus || "").trim().toLowerCase() === "success";
                    return (
                      <tr key={tx.id || tx.invoiceNumber} className="hover:bg-gray-50">
                        <td className="py-3 px-3 font-bold text-blue-900">{tx.invoiceNumber}</td>
                        <td className="py-3 px-3 text-gray-600">{formatDate(tx.date)}</td>
                        <td className="py-3 px-3 font-medium text-gray-900">{tx.customerName || "Walk-in Customer"}</td>
                        <td className="py-3 px-3 font-bold text-gray-900">{formatCurrency(tx.totalAmount)}</td>
                        <td className="py-3 px-3 text-gray-600">{tx.paymentMethod || "Cash"}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] ${isSuccess ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {tx.paymentStatus || "Pending"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCompletedSale(tx)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" /> Reprint
                            </button>
                            {user?.role === "admin" && isSuccess && (
                              <button
                                type="button"
                                onClick={() => handleRestoreTransaction(tx)}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" /> Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Receipt Modal Trigger */}
      {completedSale && (
        <Receipt
          sale={completedSale}
          settings={settings}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
}