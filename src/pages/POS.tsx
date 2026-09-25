import React, { useState, useContext } from "react";
import { Product, Sale } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { Printer, FileText, Truck, ShoppingCart, Search, Plus, Minus, Trash2 } from "lucide-react";
import { DataContext } from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import Receipt from "../components/Receipt";
import InvoiceModal from "../components/InvoiceModal";
import WaybillModal from "../components/WaybillModal";

export default function POS() {
  const { user } = useAuth();
  const contextData = useContext(DataContext);
  const products: Product[] = contextData?.products || [];
  const sales: Sale[] = contextData?.sales || [];
  const addSale = contextData?.addSale;
  const settings = contextData?.settings;

  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRecentSalesModal, setShowRecentSalesModal] = useState(false);
  
  // Modal states for printing/viewing documents
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [selectedInvoiceSale, setSelectedInvoiceSale] = useState<Sale | null>(null);
  const [selectedWaybillSale, setSelectedWaybillSale] = useState<Sale | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice,
        total: product.sellingPrice,
        unit: product.unit
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null; // Will filter out
          return {
            ...item,
            quantity: newQty,
            total: newQty * item.unitPrice
          };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);

  const handleCheckout = () => {
    if (cart.length === 0 || !addSale) return;
    
    const nowIsoString = new Date().toISOString();

    const newSale: Sale = {
      id: "SALE-" + Date.now(),
      invoiceNumber: "INV-" + Math.floor(100000 + Math.random() * 900000),
      date: nowIsoString,
      createdAt: nowIsoString, // Ensures a proper timestamp string is saved instead of "Just now"
      customerId: "WALK-IN",
      customerName: "Walk-in Customer",
      staffId: user?.id || "admin",
      staffName: user?.fullName || user?.name || "Staff",
      items: cart,
      subtotal: subtotal,
      discount: 0,
      totalAmount: subtotal,
      paymentMethod: "Cash",
      paymentStatus: "Paid"
    };

    addSale(newSale);
    setCompletedSale(newSale); // Opens the receipt modal automatically after checkout
    setCart([]);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left: Product Catalog */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-blue-950 flex items-center gap-2">
            <ShoppingCart className="text-amber-500" /> Sales / POS Terminal
          </h1>
          <button
            onClick={() => setShowRecentSalesModal(true)}
            className="px-3 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-colors cursor-pointer"
          >
            View Recent Sales ({sales.length})
          </button>
        </div>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3 pb-4">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              className="p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 cursor-pointer transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {product.category}
                </span>
                <h3 className="font-semibold text-xs text-gray-900 mt-2 line-clamp-2">{product.name}</h3>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-sm text-blue-950">{formatCurrency(product.sellingPrice)}</span>
                <span className="text-[10px] text-gray-500">Stock: {product.currentStock}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-blue-900 text-white font-bold text-sm">
          Current Order
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-12">Cart is empty. Click products to add.</p>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-900">{item.productName}</p>
                  <span className="text-xs font-bold text-blue-950">{formatCurrency(item.total)}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                  <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-1.5 py-0.5">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="text-gray-500 hover:text-black p-0.5 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold px-1">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="text-gray-500 hover:text-black p-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => setCart(cart.filter((_, i) => i !== index))}
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

        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
          <div className="flex justify-between text-sm font-bold text-blue-950">
            <span>Total:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            Complete Sale
          </button>
        </div>
      </div>

      {/* Recent Sales Modal */}
      {showRecentSalesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-sm text-blue-950">Recent Transactions</h2>
              <button 
                onClick={() => setShowRecentSalesModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {(!sales || sales.length === 0) ? (
                <p className="text-center text-gray-400 text-xs py-8">No recorded transactions yet.</p>
              ) : (
                [...(sales || [])]
                  .filter(s => s && (s.createdAt || s.date))
                  .sort((a, b) => {
                    const timeA = new Date(a.createdAt || a.date || 0).getTime();
                    const timeB = new Date(b.createdAt || b.date || 0).getTime();
                    return timeB - timeA;
                  })
                  .slice(0, 20)
                  .map((sale: Sale) => (
                    <div 
                      key={sale.id || sale.invoiceNumber}
                      className="p-3.5 bg-white border border-gray-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-blue-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-blue-950">{sale.invoiceNumber}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold rounded-full">
                            {sale.paymentMethod || "Cash"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium">
                          Customer: <strong className="text-gray-900">{sale.customerName || "Walk-in"}</strong>
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatDate(sale.createdAt || sale.date)} &bull; {sale.items?.length || 0} items
                        </p>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <span className="font-bold text-sm text-blue-950">
                          {formatCurrency(sale.totalAmount || 0)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setShowRecentSalesModal(false);
                              setCompletedSale(sale);
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Reprint Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowRecentSalesModal(false);
                              setSelectedInvoiceSale(sale);
                            }}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="View / Print Invoice"
                          >
                            <FileText className="w-3.5 h-3.5 text-gray-600" />
                            <span>Invoice</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowRecentSalesModal(false);
                              setSelectedWaybillSale(sale);
                            }}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="View / Print Waybill"
                          >
                            <Truck className="w-3.5 h-3.5 text-gray-600" />
                            <span>Waybill</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Render Modals when triggered */}
      {completedSale && (
        <Receipt
          sale={completedSale}
          settings={settings}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {selectedInvoiceSale && (
        <InvoiceModal
          sale={selectedInvoiceSale}
          settings={settings}
          onClose={() => setSelectedInvoiceSale(null)}
        />
      )}

      {selectedWaybillSale && (
        <WaybillModal
          sale={selectedWaybillSale}
          settings={settings}
          onClose={() => setSelectedWaybillSale(null)}
        />
      )}
    </div>
  );
}