import React, { useState, useContext, useMemo } from "react";
import { DataContext } from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import { apiCall } from "../lib/api";
import { Product, Customer, SaleItem, Sale } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import Receipt from "../components/Receipt";
import InvoiceModal from "../components/InvoiceModal";
import WaybillModal from "../components/WaybillModal";
import { printReceipt } from "../lib/receiptPrinter";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  UserCheck, 
  AlertCircle, 
  Search, 
  Filter, 
  Printer, 
  History, 
  FileText, 
  Truck,
  RotateCcw,
  CheckCircle2,
  X
} from "lucide-react";

export default function POS() {
  const { products = [], customers = [], settings = {}, sales = [], refreshData } = useContext(DataContext);
  const { user } = useAuth();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(customers[0] || { id: "cust_walkin", fullName: "Walk-in Customer", type: "Retail" });
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [cardQuantities, setCardQuantities] = useState<Record<string, string>>({});
  
  // Modals for reprint & recent sales
  const [showRecentSalesModal, setShowRecentSalesModal] = useState(false);
  const [selectedInvoiceSale, setSelectedInvoiceSale] = useState<Sale | null>(null);
  const [selectedWaybillSale, setSelectedWaybillSale] = useState<Sale | null>(null);

  // Updated fixed price defaults
  const RETAIL_PRICE = 1250;
  const WHOLESALE_PRICE = 1130;
  const DEFAULT_STOCK_BALANCE = 10007.61;

  const categories: string[] = useMemo(() => {
    const cats = Array.from(new Set(products.map((p: Product) => p.category).filter(Boolean))) as string[];
    return ["ALL", ...cats];
  }, [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((p: Product) => {
      if (p.status !== "Active") return false;
      const matchesCategory = selectedCategory === "ALL" || p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

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
    const unitPrice = isWholesale ? WHOLESALE_PRICE : RETAIL_PRICE;
    const qtyToAdd = customQty !== undefined ? customQty : getProductCardQty(product.id);
    const availableStock = product.currentStock ?? DEFAULT_STOCK_BALANCE;

    if (qtyToAdd <= 0) {
      setError("Please enter a valid quantity greater than 0.");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.unitPrice === unitPrice);
      if (existing) {
        const nextQty = existing.quantity + qtyToAdd;
        if (nextQty > availableStock) {
          setError(`Cannot add ${qtyToAdd}. Only ${availableStock} ${product.unit || 'units'} available in stock.`);
          return prev;
        }
        return prev.map(item => 
          item.productId === product.id && item.unitPrice === unitPrice
            ? { ...item, quantity: nextQty, total: nextQty * unitPrice }
            : item
        );
      }
      
      if (availableStock < qtyToAdd) {
        setError(`Insufficient stock! Only ${availableStock} ${product.unit || 'units'} available.`);
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
    const product = products.find((p: Product) => p.id === item.productId);
    const availableStock = product?.currentStock ?? DEFAULT_STOCK_BALANCE;

    if (product && parsed > availableStock) {
      setError(`Cannot exceed available stock of ${availableStock} ${product.unit || 'units'}.`);
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
      const product = products.find((p: Product) => p.id === item.productId);
      const availableStock = product?.currentStock ?? DEFAULT_STOCK_BALANCE;
      
      const newQuantity = Math.max(0, (item.quantity || 0) + delta);
      
      if (newQuantity <= 0) {
        return newCart.filter((_, i) => i !== index);
      }
      
      if (product && newQuantity > availableStock) {
        setError(`Cannot exceed available stock (${availableStock} ${product.unit || 'units'}).`);
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

  const lastSale = completedSale || (sales.length > 0 ? sales[sales.length - 1] : null);

  const handleCheckout = async (autoPrint: boolean = false) => {
    if (cart.length === 0) return;

    const hasZeroQty = cart.some(item => !item.quantity || item.quantity <= 0);
    if (hasZeroQty) {
      setError("Please ensure all items have a valid quantity greater than 0.");
      return;
    }

    for (const item of cart) {
      const product = products.find((p: Product) => p.id === item.productId);
      const availableStock = product?.currentStock ?? DEFAULT_STOCK_BALANCE;
      if (product && item.quantity > availableStock) {
        setError(`Stock depletion alert: Insufficient stock for ${product.name}. Remaining stock: ${availableStock}`);
        return;
      }
    }

    setIsProcessing(true);
    setError("");

    try {
      const salePayload = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        staffId: user?.id,
        staffName: user?.fullName,
        items: cart,
        subtotal,
        discount,
        totalAmount: total,
        paymentMethod,
        paymentStatus: "Completed"
      };

      const result = await apiCall("addSale", salePayload);

      for (const item of cart) {
        const targetProduct = products.find((p: Product) => p.id === item.productId);
        if (targetProduct) {
          const currentStockVal = targetProduct.currentStock ?? DEFAULT_STOCK_BALANCE;
          const updatedStock = Math.max(0, currentStockVal - item.quantity);
          await apiCall("updateProduct", {
            id: targetProduct.id,
            currentStock: updatedStock
          }).catch(err => console.warn("Stock depletion sync error:", err));
        }
      }

      setCompletedSale(result);
      setCart([]);
      setDiscount(0);
      
      await refreshData();

      if (autoPrint) {
        setTimeout(async () => {
          try {
            await printReceipt(result, settings, "thermal80");
          } catch (pErr) {
            console.warn("Auto-print error:", pErr);
          }
        }, 300);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process sale.");
    } finally {
      setIsProcessing(false);
    }
  };

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

          <div className="flex items-center gap-2">
            {lastSale && (
              <button
                type="button"
                onClick={() => setCompletedSale(lastSale)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title={`Reprint receipt for ${lastSale.invoiceNumber}`}
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Reprint Last Receipt</span>
                <span className="sm:hidden">Reprint</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowRecentSalesModal(true)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="View recent transactions and reprint receipts/invoices"
            >
              <History className="w-3.5 h-3.5 text-gray-600" />
              <span>Recent Sales</span>
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
                  const cust = customers.find((c: Customer) => c.id === e.target.value) || customers[0];
                  setSelectedCustomer(cust);
                  if (cust.type !== "Wholesale" && paymentMethod === "Credit") {
                    setPaymentMethod("Cash");
                  }
                }}
              >
                {customers.map((c: Customer) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.type === 'Wholesale' ? `(Wholesale${c.businessName ? ` - ${c.businessName}` : ''})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search fuel, lubricants, stock..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {selectedCustomer.type === "Wholesale" && (
            <div className="pt-2 border-t border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs bg-purple-50/70 p-2.5 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-950 uppercase tracking-wide text-[10px]">
                  Wholesale Credit Profile:
                </span>
                <span className="text-gray-700">
                  Limit: <strong className="text-purple-900">{formatCurrency(selectedCustomer.creditLimit || 0)}</strong>
                </span>
                <span className="text-gray-400">&bull;</span>
                <span className="text-gray-700">
                  Balance Owed: <strong className={(selectedCustomer.outstandingBalance || 0) > 0 ? "text-red-700" : "text-emerald-700"}>
                    {formatCurrency(selectedCustomer.outstandingBalance || 0)}
                  </strong>
                </span>
                <span className="text-gray-400">&bull;</span>
                <span className="text-gray-700">
                  Available: <strong className={((selectedCustomer.creditLimit || 0) - (selectedCustomer.outstandingBalance || 0)) >= 0 ? "text-emerald-800" : "text-red-600"}>
                    {formatCurrency((selectedCustomer.creditLimit || 0) - (selectedCustomer.outstandingBalance || 0))}
                  </strong>
                </span>
              </div>

              {(selectedCustomer.outstandingBalance || 0) >= (selectedCustomer.creditLimit || 0) && (selectedCustomer.creditLimit || 0) > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[10px] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Credit Limit Reached
                </span>
              )}
            </div>
          )}
        </div>

        {/* Category Pills */}
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
                className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleProducts.map((product: Product) => {
                const cardQty = cardQuantities[product.id] ?? "1";
                const stockVal = product.currentStock ?? DEFAULT_STOCK_BALANCE;
                const isOutOfStock = stockVal <= 0;

                return (
                  <div key={product.id} className="border border-gray-200 rounded-xl p-3.5 hover:border-blue-400 transition-colors flex flex-col bg-white">
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
                      <span className="text-gray-500 font-medium">Qty to sell:</span>
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
                          title="Key in quantity to add"
                        />
                        <span className="text-gray-400 text-[11px] font-medium">{product.unit || 'units'}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-2 grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(product, false)}
                        className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed text-blue-900 px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
                        title="Add with Retail Price"
                      >
                        <span className="text-[10px] text-blue-600 uppercase font-medium">Retail</span>
                        <span className="font-bold">{formatCurrency(RETAIL_PRICE)}</span>
                      </button>
                      <button 
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(product, true)}
                        className="flex flex-col items-center justify-center bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed text-amber-900 px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
                        title="Add with Wholesale Price"
                      >
                        <span className="text-[10px] text-amber-600 uppercase font-medium">Wholesale</span>
                        <span className="font-bold">{formatCurrency(WHOLESALE_PRICE)}</span>
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
                title="Clear all items in cart"
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
              <p className="text-xs text-gray-400 mt-1">Select products and key in quantity to add</p>
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
                      title="Decrease by 1"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    
                    <div className="relative">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => handleCartQuantityChange(index, e.target.value)}
                        onBlur={() => handleCartQuantityBlur(index)}
                        className="w-16 px-1.5 py-0.5 text-center font-bold text-xs text-gray-900 bg-white border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                        title="Key in quantity to be sold directly"
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={() => updateQuantity(index, 1)} 
                      className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors cursor-pointer"
                      title="Increase by 1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => removeFromCart(index)} 
                      className="p-1 ml-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                      title="Remove item from cart"
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
            <span className="text-gray-600">Discount ({user?.role === "admin" ? "Admin" : "Standard"})</span>
            <input 
              type="number" 
              value={discount === 0 ? "" : discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
              className="w-20 text-right px-2 py-0.5 text-xs bg-white border border-gray-200 rounded outline-none focus:ring-1 focus:ring-amber-500"
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
              {selectedCustomer.type === "Wholesale" && (
                <option value="Credit">Credit / Account</option>
              )}
            </select>
          </div>

          {paymentMethod === "Credit" && selectedCustomer.type === "Wholesale" && (
            <div className="p-2 bg-purple-50 rounded-lg border border-purple-200 text-[11px] text-purple-900 space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Credit Sale Mode:</span>
                <span className="text-purple-700">Account #{selectedCustomer.id}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>Projected New Balance:</span>
                <span className="font-bold text-red-700">
                  {formatCurrency((selectedCustomer.outstandingBalance || 0) + total)}
                </span>
              </div>
              {(selectedCustomer.outstandingBalance || 0) + total > (selectedCustomer.creditLimit || 0) && (selectedCustomer.creditLimit || 0) > 0 && (
                <div className="text-[10px] text-red-700 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                  <span>Warning: Sale exceeds authorized credit limit of {formatCurrency(selectedCustomer.creditLimit || 0)}</span>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="font-bold text-sm text-gray-800">Total Payable</span>
            <span className="font-bold text-xl text-blue-950">{formatCurrency(total)}</span>
          </div>

          <div className="pt-1 grid grid-cols-1 gap-2">
            <button 
              type="button"
              onClick={() => handleCheckout(true)}
              disabled={cart.length === 0 || isProcessing}
              className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2 text-sm cursor-pointer"
              title="Finalize sale and automatically open printer dialog"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isProcessing ? "Processing..." : "Confirm & Print Receipt"}</span>
            </button>

            <button 
              type="button"
              onClick={() => handleCheckout(false)}
              disabled={cart.length === 0 || isProcessing}
              className="w-full bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-800 font-semibold py-2 rounded-xl transition-colors text-xs flex justify-center items-center gap-1.5 cursor-pointer"
            >
              <span>Confirm Payment Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* POS Receipt Modal */}
      {completedSale && (
        <Receipt 
          sale={completedSale} 
          settings={settings} 
          onClose={() => setCompletedSale(null)} 
        />
      )}

      {/* Invoice Modal */}
      {selectedInvoiceSale && (
        <InvoiceModal
          sale={selectedInvoiceSale}
          settings={settings}
          onClose={() => setSelectedInvoiceSale(null)}
        />
      )}

      {/* Waybill Modal */}
      {selectedWaybillSale && (
        <WaybillModal
          sale={selectedWaybillSale}
          settings={settings}
          onClose={() => setSelectedWaybillSale(null)}
        />
      )}

      {/* Recent Sales Drawer Modal */}
      {showRecentSalesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-100 bg-blue-950 text-white">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">Recent POS Sales &amp; Reprint</h3>
              </div>
              <button 
                onClick={() => setShowRecentSalesModal(false)}
                className="text-gray-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {sales.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-8">No recorded transactions yet.</p>
              ) : (
                [...sales].reverse().slice(0, 15).map((s: Sale) => (
                  <div key={s.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-gray-900">{s.invoiceNumber || s.id}</div>
                      <div className="text-gray-500">{s.customerName} &bull; {formatDate(s.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-950">{formatCurrency(s.totalAmount)}</span>
                      <button
                        onClick={() => {
                          setShowRecentSalesModal(false);
                          setCompletedSale(s);
                        }}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" /> Reprint
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}