import React, { useContext, useMemo, useState } from "react";
import { Product, Sale, Customer } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import {
  Printer,
  FileText,
  Truck,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Tag,
  User,
} from "lucide-react";
import { DataContext } from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import Receipt from "../components/Receipt";
import InvoiceModal from "../components/InvoiceModal";
import WaybillModal from "../components/WaybillModal";

type PriceTier = "retail" | "wholesale";
type DiscountType = "fixed" | "percentage";
type PaymentMethod = "Cash" | "Transfer" | "Card" | "Split";

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
  priceTier: PriceTier;
}

const POS: React.FC = () => {
  const { user } = useAuth();

  const contextData = useContext(DataContext);

  const products: Product[] = contextData?.products || [];
  const sales: Sale[] = contextData?.sales || [];
  const customers: Customer[] = contextData?.customers || [];
  const addSale = contextData?.addSale;
  const settings = contextData?.settings;

  // ---------------------------------------------------------
  // Cart & Search
  // ---------------------------------------------------------

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceTier, setPriceTier] = useState<PriceTier>("retail");
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  // ---------------------------------------------------------
  // Financial Inputs
  // ---------------------------------------------------------

  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] =
    useState<DiscountType>("fixed");

  const [taxRate, setTaxRate] = useState<number>(7.5);

  // ---------------------------------------------------------
  // Checkout / Payment
  // ---------------------------------------------------------

  const [showCheckoutModal, setShowCheckoutModal] =
    useState(false);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Cash");

  const [cashAmountPaid, setCashAmountPaid] =
    useState<number>(0);

  const [transferAmountPaid, setTransferAmountPaid] =
    useState<number>(0);

  const [cardAmountPaid, setCardAmountPaid] =
    useState<number>(0);

  // ---------------------------------------------------------
  // Other Modals
  // ---------------------------------------------------------

  const [showRecentSalesModal, setShowRecentSalesModal] =
    useState(false);

  const [completedSale, setCompletedSale] =
    useState<Sale | null>(null);

  const [selectedInvoiceSale, setSelectedInvoiceSale] =
    useState<Sale | null>(null);

  const [selectedWaybillSale, setSelectedWaybillSale] =
    useState<Sale | null>(null);

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  const safeNumber = (value: number): number => {
    return Number.isFinite(value) ? value : 0;
  };

  const getProductPrice = (
    product: Product,
    tier: PriceTier
  ): number => {
    if (tier === "wholesale") {
      return safeNumber(
        product.wholesalePrice ?? product.sellingPrice
      );
    }

    return safeNumber(
      product.retailPrice ?? product.sellingPrice
    );
  };

  const getAvailableStock = (product: Product): number => {
    const stock = Number(product.currentStock);

    if (!Number.isFinite(stock)) {
      return 0;
    }

    return Math.max(0, stock);
  };

  // ---------------------------------------------------------
  // Product Search
  // ---------------------------------------------------------

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const category = product.category?.toLowerCase() || "";

      return (
        name.includes(search) ||
        category.includes(search)
      );
    });
  }, [products, searchTerm]);

  // ---------------------------------------------------------
  // Add Product To Cart
  // ---------------------------------------------------------

  const addToCart = (product: Product) => {
    const availableStock = getAvailableStock(product);

    if (availableStock <= 0) {
      window.alert(
        `${product.name} is currently out of stock.`
      );
      return;
    }

    const unitPrice = getProductPrice(product, priceTier);

    if (unitPrice < 0) {
      window.alert(
        `Invalid selling price configured for ${product.name}.`
      );
      return;
    }

    setCart((previousCart) => {
      const existingIndex = previousCart.findIndex(
        (item) =>
          item.productId === product.id &&
          item.priceTier === priceTier
      );

      if (existingIndex >= 0) {
        const existingItem = previousCart[existingIndex];

        if (existingItem.quantity >= availableStock) {
          window.alert(
            `Only ${availableStock} unit(s) of ${product.name} are available.`
          );

          return previousCart;
        }

        return previousCart.map((item, index) => {
          if (index !== existingIndex) {
            return item;
          }

          const newQuantity = item.quantity + 1;

          return {
            ...item,
            quantity: newQuantity,
            total: newQuantity * item.unitPrice,
          };
        });
      }

      return [
        ...previousCart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice,
          total: unitPrice,
          unit: product.unit,
          priceTier,
        },
      ];
    });
  };

  // ---------------------------------------------------------
  // Update Cart Quantity
  // ---------------------------------------------------------

  const updateQuantity = (
    productId: string,
    selectedTier: PriceTier,
    newQuantity: number
  ) => {
    const product = products.find(
      (item) => item.id === productId
    );

    if (!product) {
      return;
    }

    const availableStock = getAvailableStock(product);

    if (newQuantity <= 0) {
      setCart((previousCart) =>
        previousCart.filter(
          (item) =>
            !(
              item.productId === productId &&
              item.priceTier === selectedTier
            )
        )
      );

      return;
    }

    const quantity = Math.floor(newQuantity);

    if (quantity > availableStock) {
      window.alert(
        `Only ${availableStock} unit(s) of ${product.name} are available.`
      );

      return;
    }

    setCart((previousCart) =>
      previousCart.map((item) => {
        if (
          item.productId === productId &&
          item.priceTier === selectedTier
        ) {
          return {
            ...item,
            quantity,
            total: quantity * item.unitPrice,
          };
        }

        return item;
      })
    );
  };

  // ---------------------------------------------------------
  // Remove Cart Item
  // ---------------------------------------------------------

  const removeFromCart = (index: number) => {
    setCart((previousCart) =>
      previousCart.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // ---------------------------------------------------------
  // Financial Calculations
  // ---------------------------------------------------------

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + safeNumber(item.total),
      0
    );
  }, [cart]);

  const calculatedDiscount = useMemo(() => {
    const discount = Math.max(
      0,
      safeNumber(discountValue)
    );

    if (discountType === "percentage") {
      const percentage = Math.min(discount, 100);

      return (subtotal * percentage) / 100;
    }

    return Math.min(discount, subtotal);
  }, [subtotal, discountValue, discountType]);

  const taxableAmount = Math.max(
    0,
    subtotal - calculatedDiscount
  );

  const calculatedTax = useMemo(() => {
    const rate = Math.max(0, safeNumber(taxRate));

    return (taxableAmount * rate) / 100;
  }, [taxableAmount, taxRate]);

  const grandTotal = Math.max(
    0,
    taxableAmount + calculatedTax
  );

  // ---------------------------------------------------------
  // Payment Calculations
  // ---------------------------------------------------------

  const totalPaid = useMemo(() => {
    switch (paymentMethod) {
      case "Cash":
        return Math.max(0, safeNumber(cashAmountPaid));

      case "Transfer":
        return Math.max(0, safeNumber(transferAmountPaid));

      case "Card":
        return Math.max(0, safeNumber(cardAmountPaid));

      case "Split":
        return (
          Math.max(0, safeNumber(cashAmountPaid)) +
          Math.max(0, safeNumber(transferAmountPaid)) +
          Math.max(0, safeNumber(cardAmountPaid))
        );

      default:
        return 0;
    }
  }, [
    paymentMethod,
    cashAmountPaid,
    transferAmountPaid,
    cardAmountPaid,
  ]);

  const changeDue = Math.max(
    0,
    totalPaid - grandTotal
  );

  const remainingBalance = Math.max(
    0,
    grandTotal - totalPaid
  );

  const paymentComplete =
    grandTotal > 0 && totalPaid >= grandTotal;

  // ---------------------------------------------------------
  // Open Checkout
  // ---------------------------------------------------------

  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      window.alert("Please add at least one product to the cart.");
      return;
    }

    setCashAmountPaid(grandTotal);
    setTransferAmountPaid(0);
    setCardAmountPaid(0);
    setPaymentMethod("Cash");

    setShowCheckoutModal(true);
  };

  // ---------------------------------------------------------
  // Change Payment Method
  // ---------------------------------------------------------

  const handlePaymentMethodChange = (
    method: PaymentMethod
  ) => {
    setPaymentMethod(method);

    setCashAmountPaid(0);
    setTransferAmountPaid(0);
    setCardAmountPaid(0);

    if (method === "Cash") {
      setCashAmountPaid(grandTotal);
    }

    if (method === "Transfer") {
      setTransferAmountPaid(grandTotal);
    }

    if (method === "Card") {
      setCardAmountPaid(grandTotal);
    }
  };

  // ---------------------------------------------------------
  // Validate Stock Before Checkout
  // ---------------------------------------------------------

  const validateStockBeforeCheckout = (): boolean => {
    for (const cartItem of cart) {
      const product = products.find(
        (item) => item.id === cartItem.productId
      );

      if (!product) {
        window.alert(
          `Product "${cartItem.productName}" could not be found.`
        );

        return false;
      }

      const availableStock = getAvailableStock(product);

      if (cartItem.quantity > availableStock) {
        window.alert(
          `Insufficient stock for ${cartItem.productName}.\n\nAvailable: ${availableStock}\nRequested: ${cartItem.quantity}`
        );

        return false;
      }
    }

    return true;
  };

  // ---------------------------------------------------------
  // Complete Checkout
  // ---------------------------------------------------------

  const handleCompleteCheckout = () => {
    if (!addSale) {
      window.alert(
        "Sales function is unavailable. Please check your application configuration."
      );

      return;
    }

    if (cart.length === 0) {
      window.alert("The cart is empty.");
      return;
    }

    if (!validateStockBeforeCheckout()) {
      return;
    }

    if (grandTotal <= 0) {
      window.alert(
        "The sale total must be greater than ₦0."
      );

      return;
    }

    if (totalPaid < grandTotal) {
      window.alert(
        `Payment is incomplete.\n\nRemaining balance: ${formatCurrency(
          remainingBalance
        )}`
      );

      return;
    }

    const nowIsoString = new Date().toISOString();

    const newSale: Sale = {
      id: `SALE-${Date.now()}`,

      invoiceNumber: `INV-${Math.floor(
        100000 + Math.random() * 900000
      )}`,

      date: nowIsoString,

      createdAt: nowIsoString,

      customerId:
        selectedCustomer?.id || "WALK-IN",

      customerName:
        selectedCustomer?.name ||
        (priceTier === "wholesale"
          ? "Wholesale Customer"
          : "Walk-in Customer"),

      staffId: user?.id || "admin",

      staffName:
        user?.fullName ||
        user?.name ||
        "Staff",

      items: cart,

      subtotal,

      discount: calculatedDiscount,

      tax: calculatedTax,

      totalAmount: grandTotal,

      paymentMethod,

      paymentStatus: "Paid",
    };

    try {
      addSale(newSale);

      setCompletedSale(newSale);

      setCart([]);

      setSelectedCustomer(null);

      setDiscountValue(0);

      setDiscountType("fixed");

      setCashAmountPaid(0);

      setTransferAmountPaid(0);

      setCardAmountPaid(0);

      setShowCheckoutModal(false);
    } catch (error) {
      console.error(
        "Error completing sale:",
        error
      );

      window.alert(
        "The sale could not be completed. Please try again."
      );
    }
  };

  // ---------------------------------------------------------
  // Recent Sales
  // ---------------------------------------------------------

  const sortedRecentSales = useMemo(() => {
    return [...sales]
      .filter(
        (sale) =>
          sale &&
          (sale.createdAt || sale.date)
      )
      .sort((a, b) => {
        const dateA = a.createdAt || a.date;
        const dateB = b.createdAt || b.date;

        const timeA = dateA
          ? new Date(dateA).getTime()
          : 0;

        const timeB = dateB
          ? new Date(dateB).getTime()
          : 0;

        return timeB - timeA;
      })
      .slice(0, 20);
  }, [sales]);

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* =====================================================
          LEFT: PRODUCT CATALOG
      ====================================================== */}

      <div className="flex-1 flex flex-col p-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">

          <h1 className="text-xl font-bold text-blue-950 flex items-center gap-2">
            <ShoppingCart className="text-amber-500" />

            Sales / POS Terminal
          </h1>

          <div className="flex items-center gap-3">

            {/* Price Tier */}
            <div className="bg-gray-200 p-1 rounded-xl flex items-center text-xs font-semibold">

              <button
                type="button"
                onClick={() => setPriceTier("retail")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  priceTier === "retail"
                    ? "bg-white text-blue-950 shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Retail
              </button>

              <button
                type="button"
                onClick={() => setPriceTier("wholesale")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  priceTier === "wholesale"
                    ? "bg-blue-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Wholesale
              </button>

            </div>

            {/* Recent Sales */}
            <button
              type="button"
              onClick={() =>
                setShowRecentSalesModal(true)
              }
              className="px-3 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-colors cursor-pointer"
            >
              View Recent Sales ({sales.length})
            </button>

          </div>
        </div>

        {/* Search */}
        <div className="mb-4 relative">

          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />

          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
          />

        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3 pb-4">

          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center text-gray-400 text-sm py-12">
              No products found.
            </div>
          ) : (
            filteredProducts.map((product) => {

              const activePrice =
                getProductPrice(
                  product,
                  priceTier
                );

              const stock =
                getAvailableStock(product);

              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`p-3 bg-white border rounded-xl transition-all flex flex-col justify-between shadow-sm ${
                    stock > 0
                      ? "border-gray-200 hover:border-blue-500 cursor-pointer"
                      : "border-gray-200 opacity-60 cursor-not-allowed"
                  }`}
                >

                  <div>

                    <div className="flex items-center justify-between">

                      <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {product.category}
                      </span>

                      <span className="text-[10px] text-gray-400 capitalize flex items-center gap-1">

                        <Tag className="w-3 h-3" />

                        {priceTier}

                      </span>

                    </div>

                    <h3 className="font-semibold text-xs text-gray-900 mt-2 line-clamp-2">
                      {product.name}
                    </h3>

                  </div>

                  <div className="mt-3 flex items-center justify-between">

                    <span className="font-bold text-sm text-blue-950">
                      {formatCurrency(activePrice)}
                    </span>

                    <span
                      className={`text-[10px] ${
                        stock <= 0
                          ? "text-red-500 font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      Stock: {stock}
                    </span>

                  </div>

                </div>
              );
            })
          )}

        </div>
      </div>

      {/* =====================================================
          RIGHT: CART
      ====================================================== */}

      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">

        <div className="p-4 border-b border-gray-200 bg-blue-900 text-white font-bold text-sm flex items-center justify-between">

          <span>Current Order</span>

          <span className="text-[10px] bg-blue-800 uppercase px-2 py-0.5 rounded tracking-wider">
            {priceTier} Mode
          </span>

        </div>

        {/* Customer */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-col gap-1.5">

          <label className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">

            <User className="w-3 h-3 text-blue-900" />

            Customer Name

          </label>

          <select
            value={
              selectedCustomer
                ? selectedCustomer.id
                : "walk-in"
            }
            onChange={(event) => {

              if (
                event.target.value === "walk-in"
              ) {
                setSelectedCustomer(null);
                return;
              }

              const found = customers.find(
                (customer) =>
                  customer.id ===
                  event.target.value
              );

              setSelectedCustomer(
                found || null
              );
            }}
            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 cursor-pointer"
          >

            <option value="walk-in">
              Walk-in Customer (Default)
            </option>

            {customers.map((customer) => (
              <option
                key={customer.id}
                value={customer.id}
              >
                {customer.name}

                {customer.phone
                  ? ` (${customer.phone})`
                  : ""}
              </option>
            ))}

          </select>

        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {cart.length === 0 ? (

            <p className="text-center text-gray-400 text-xs py-12">
              Cart is empty. Click products to add.
            </p>

          ) : (

            cart.map((item, index) => (

              <div
                key={`${item.productId}-${item.priceTier}-${index}`}
                className="flex flex-col gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100"
              >

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-semibold text-gray-900">
                      {item.productName}
                    </p>

                    <span className="text-[10px] text-gray-500 uppercase">
                      ({item.priceTier}) •{" "}
                      {formatCurrency(item.unitPrice)}
                      {" "}each
                    </span>

                  </div>

                  <span className="text-xs font-bold text-blue-950">
                    {formatCurrency(item.total)}
                  </span>

                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">

                  {/* Quantity */}
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-1 py-0.5">

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.priceTier,
                          item.quantity - 1
                        )
                      }
                      className="text-gray-500 hover:text-black p-0.5 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(event) => {
                        const rawValue = event.target.value;
                        if (rawValue === "") {
                          updateQuantity(item.productId, item.priceTier, 0);
                          return;
                        }
                        const value = Number(rawValue);
                        if (!Number.isNaN(value)) {
                          updateQuantity(item.productId, item.priceTier, value);
                        }
                      }}
                      className="w-12 text-center text-xs font-bold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.priceTier,
                          item.quantity + 1
                        )
                      }
                      className="text-gray-500 hover:text-black p-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() =>
                      removeFromCart(index)
                    }
                    className="text-red-500 hover:text-red-700 p-1 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>

                </div>
              </div>
            ))
          )}

        </div>

        {/* Pricing Summary */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2.5">

          <div className="flex justify-between text-xs text-gray-600">

            <span>Subtotal:</span>

            <span className="font-semibold text-gray-900">
              {formatCurrency(subtotal)}
            </span>

          </div>

          {/* Discount */}
          <div className="flex items-center justify-between text-xs text-gray-600 pt-1">

            <span>Discount:</span>

            <div className="flex items-center gap-1">

              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(event) =>
                  setDiscountValue(
                    Math.max(
                      0,
                      Number(event.target.value) || 0
                    )
                  )
                }
                className="w-16 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-right text-xs font-semibold focus:outline-none focus:border-blue-500"
              />

              <select
                value={discountType}
                onChange={(event) =>
                  setDiscountType(
                    event.target.value as DiscountType
                  )
                }
                className="bg-white border border-gray-200 rounded px-1 py-0.5 text-[11px] font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="fixed">
                  Flat
                </option>

                <option value="percentage">
                  %
                </option>
              </select>

            </div>

          </div>

          {calculatedDiscount > 0 && (
            <div className="flex justify-between text-[11px] text-emerald-600 font-medium">

              <span>
                Discount Amount:
              </span>

              <span>
                - {formatCurrency(calculatedDiscount)}
              </span>

            </div>
          )}

          {/* Tax */}
          <div className="flex items-center justify-between text-xs text-gray-600 pt-1">

            <span>Tax Rate (%):</span>

            <div className="flex items-center gap-1">

              <input
                type="number"
                min="0"
                step="0.1"
                value={taxRate}
                onChange={(event) =>
                  setTaxRate(
                    Math.max(
                      0,
                      Number(event.target.value) || 0
                    )
                  )
                }
                className="w-16 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-right text-xs font-semibold focus:outline-none focus:border-blue-500"
              />

              <span className="text-[11px] text-gray-500">
                %
              </span>

            </div>

          </div>

          {calculatedTax > 0 && (
            <div className="flex justify-between text-[11px] text-gray-500">

              <span>
                Tax Total:
              </span>

              <span>
                + {formatCurrency(calculatedTax)}
              </span>

            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between text-sm font-bold text-blue-950 pt-2 border-t border-gray-200">

            <span>
              Grand Total:
            </span>

            <span>
              {formatCurrency(grandTotal)}
            </span>

          </div>

          <button
            type="button"
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer mt-1"
          >
            Proceed to Payment
          </button>

        </div>
      </div>

      {/* =====================================================
          CHECKOUT MODAL
      ====================================================== */}

      {showCheckoutModal && (

        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">

            {/* Header */}
            <div className="px-5 py-4 bg-blue-950 text-white flex justify-between items-center">

              <h3 className="font-bold text-sm">
                Checkout & Payment
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowCheckoutModal(false)
                }
                className="text-gray-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>

            </div>

            <div className="p-5 space-y-4">

              {/* Total */}
              <div className="bg-blue-50 p-3 rounded-xl flex justify-between items-center border border-blue-100">

                <span className="text-xs font-semibold text-blue-900">
                  Total Due:
                </span>

                <span className="text-base font-bold text-blue-950">
                  {formatCurrency(grandTotal)}
                </span>

              </div>

              {/* Payment Method */}
              <div>

                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  Select Payment Method
                </label>

                <div className="grid grid-cols-4 gap-2">

                  {(
                    [
                      "Cash",
                      "Transfer",
                      "Card",
                      "Split",
                    ] as const
                  ).map((method) => (

                    <button
                      key={method}
                      type="button"
                      onClick={() =>
                        handlePaymentMethodChange(method)
                      }
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        paymentMethod === method
                          ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {method}
                    </button>
                  ))}

                </div>

              </div>

              {/* Payment Breakdown Inputs */}
              <div className="space-y-3 pt-2">

                {(paymentMethod === "Cash" || paymentMethod === "Split") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Cash Amount (₦)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashAmountPaid || ""}
                      onChange={(e) =>
                        setCashAmountPaid(
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {(paymentMethod === "Transfer" || paymentMethod === "Split") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Bank Transfer Amount (₦)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={transferAmountPaid || ""}
                      onChange={(e) =>
                        setTransferAmountPaid(
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {(paymentMethod === "Card" || paymentMethod === "Split") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Card POS Amount (₦)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cardAmountPaid || ""}
                      onChange={(e) =>
                        setCardAmountPaid(
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

              </div>

              {/* Summary of Payment */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5 text-xs">

                <div className="flex justify-between text-gray-600">
                  <span>Total Paid:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>

                {changeDue > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Change Due:</span>
                    <span>{formatCurrency(changeDue)}</span>
                  </div>
                )}

                {remainingBalance > 0 && (
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Remaining Balance:</span>
                    <span>{formatCurrency(remainingBalance)}</span>
                  </div>
                )}

              </div>

              {/* Complete Payment Button */}
              <button
                type="button"
                onClick={handleCompleteCheckout}
                disabled={!paymentComplete}
                className="w-full py-3 bg-blue-900 hover:bg-blue-800 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer mt-2"
              >
                Complete Sale & Print
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          RECENT SALES MODAL
      ====================================================== */}

      {showRecentSalesModal && (

        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

            <div className="px-5 py-4 bg-blue-950 text-white flex justify-between items-center">

              <h3 className="font-bold text-sm">
                Recent Sales History
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowRecentSalesModal(false)
                }
                className="text-gray-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>

            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2">

              {sortedRecentSales.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-12">
                  No recent sales recorded yet.
                </p>
              ) : (
                sortedRecentSales.map((sale) => (

                  <div
                    key={sale.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs"
                  >

                    <div className="space-y-0.5">

                      <div className="font-bold text-gray-900">
                        {sale.invoiceNumber} • {sale.customerName}
                      </div>

                      <div className="text-gray-500 text-[10px]">
                        {formatDate(sale.createdAt || sale.date)} • <span className="uppercase text-blue-600 font-semibold">{sale.paymentMethod}</span>
                      </div>

                    </div>

                    <div className="text-right">

                      <div className="font-bold text-blue-950">
                        {formatCurrency(sale.totalAmount)}
                      </div>

                      <div className="text-[10px] text-emerald-600 font-medium">
                        {sale.paymentStatus}
                      </div>

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
};

export default POS;