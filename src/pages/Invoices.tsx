import React, { useState, useContext, useEffect, useCallback } from "react";
import { DataContext } from "../components/Layout";
import { Sale } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { downloadInvoicePdf, printInvoice } from "../lib/invoiceGenerator";
import InvoiceModal from "../components/InvoiceModal";
import Receipt from "../components/Receipt";
import WaybillModal from "../components/WaybillModal";
import { db } from "../firebase"; // Fixed relative path
import {  
  collection,  
  query,  
  orderBy,  
  limit,  
  getDocs,  
  where,  
  getCountFromServer,
  QueryConstraint
} from "firebase/firestore";
import {  
  FileText,  
  Search,  
  Download,  
  Printer,  
  Eye,  
  Check,  
  Truck,  
  Receipt as ReceiptIcon,
  Calendar,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Invoices() {
  const { settings } = useContext(DataContext);

  // Firestore Data States
  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [totalInvoicedVolume, setTotalInvoicedVolume] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal States
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForWaybill, setSelectedSaleForWaybill] = useState<Sale | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch data directly from Firestore based on filters
  const fetchFirebaseInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const invoicesRef = collection(db, "sales");
      
      // Build constraints array for Firestore query
      const constraints: QueryConstraint[] = [orderBy("date", "desc")];

      if (statusFilter !== "ALL") {
        constraints.push(where("paymentStatus", "==", statusFilter));
      }

      if (startDate) {
        constraints.push(where("date", ">=", startDate));
      }

      if (endDate) {
        constraints.push(where("date", "<=", endDate + "\uf8ff"));
      }

      // 1. Get total count and metrics for summary cards using getCountFromServer
      const countQuery = query(invoicesRef, ...constraints);
      const snapshotCount = await getCountFromServer(countQuery);
      const totalCount = snapshotCount.data().count;
      setTotalInvoicesCount(totalCount);

      // 2. Fetch all matching documents to calculate total volume & completed count 
      const allMatchingSnapshot = await getDocs(countQuery);
      let volumeSum = 0;
      let paidSum = 0;
      const allFetchedInvoices: Sale[] = [];

      allMatchingSnapshot.forEach((doc) => {
        const data = doc.data() as Sale;
        const saleData = { ...data, id: doc.id };
        allFetchedInvoices.push(saleData);

        volumeSum += (saleData.totalAmount || 0);
        if (saleData.paymentStatus === "Completed" || saleData.paymentStatus === "Paid") {
          paidSum += 1;
        }
      });

      setTotalInvoicedVolume(volumeSum);
      setCompletedCount(paidSum);

      // 3. Apply client-side search filtering if search term exists
      let filtered = allFetchedInvoices;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = allFetchedInvoices.filter(sale => 
          sale.invoiceNumber?.toLowerCase().includes(term) ||
          sale.customerName?.toLowerCase().includes(term) ||
          sale.staffName?.toLowerCase().includes(term)
        );
        setTotalInvoicesCount(filtered.length);
      }

      // 4. Slice the array for current page pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedSlice = filtered.slice(startIndex, startIndex + itemsPerPage);
      
      setInvoices(paginatedSlice);
    } catch (error) {
      console.error("Error fetching invoices from Firebase:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate, currentPage]);

  useEffect(() => {
    fetchFirebaseInvoices();
  }, [fetchFirebaseInvoices]);

  const totalPages = Math.ceil(totalInvoicesCount / itemsPerPage) || 1;

  const handleQuickDownload = async (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(sale.id);
    try {
      await downloadInvoicePdf(sale, settings);
      setTimeout(() => setDownloadingId(null), 2500);
    } catch (error) {
      console.error("Failed to download invoice PDF:", error);
      setDownloadingId(null);
    }
  };

  const handleQuickPrint = async (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await printInvoice(sale, settings);
    } catch (error) {
      console.error("Failed to print invoice:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2.5">
            <FileText className="text-amber-500 w-7 h-7" />
            Invoices Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View, generate, print and download official commercial &amp; tax invoices in PDF
          </p>
        </div>

        <Link
          to="/pos"
          className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>Create New Sale / Invoice</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoices</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{totalInvoicesCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Matching current filters</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs bg-gradient-to-br from-blue-50/50 to-white">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Total Invoiced Volume</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(totalInvoicedVolume)}</p>
          <p className="text-xs text-blue-600/80 mt-0.5">Commercial value generated</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs bg-gradient-to-br from-green-50/50 to-white">
          <p className="text-xs font-semibold text-green-900 uppercase tracking-wider">Completed / Settled</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">Fully paid &amp; reconciled</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Invoice #, Customer, Attendant..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
              {["ALL", "Paid", "Pending"].map((status) => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    statusFilter === status
                      ? "bg-white text-blue-900 shadow-2xs font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {status === "ALL" ? "All Invoices" : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date Range Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); setCurrentPage(1); }}
              className="text-blue-600 hover:underline font-semibold ml-auto cursor-pointer"
            >
              Clear Dates
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table with Loading Overlay */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-blue-700 animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Invoice #</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5 text-right">Total Amount</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((sale: Sale) => (
                <tr key={sale.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-4 font-bold text-blue-900">
                    <button
                      onClick={() => setSelectedSaleForInvoice(sale)}
                      className="hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      {sale.invoiceNumber}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">{formatDate(sale.date)}</td>
                  <td className="px-5 py-4 font-medium text-gray-800">
                    <div>{sale.customerName || "Walk-in Customer"}</div>
                    {sale.customerPhone && <div className="text-[11px] text-gray-400">{sale.customerPhone}</div>}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600">
                    {sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
                    <span className="text-gray-400 block text-[11px] truncate max-w-[180px]">
                      {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(", ")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 uppercase">
                      {sale.paymentMethod || "Cash"}
                    </span>
                    <span className="ml-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-700">
                      {sale.paymentStatus || "PAID"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-base text-blue-950">
                    {formatCurrency(sale.totalAmount)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => handleQuickDownload(sale, e)}
                        className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Download Invoice PDF"
                      >
                        {downloadingId === sale.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={(e) => handleQuickPrint(sale, e)}
                        className="p-1.5 text-gray-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Print A4 Invoice"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setSelectedSaleForInvoice(sale)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        title="View Full Invoice"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => setSelectedSaleForWaybill(sale)}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                        title="Generate / View Waybill"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Waybill</span>
                      </button>

                      <button
                        onClick={() => setSelectedSaleForReceipt(sale)}
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="Print / View Thermal Receipt"
                      >
                        <ReceiptIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-gray-600 text-base">No Invoices Found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria or date filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalInvoicesCount > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
            <div>
              Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalInvoicesCount)}</span> of{" "}
              <span className="font-semibold">{totalInvoicesCount}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="p-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
                className="p-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedSaleForInvoice && (
        <InvoiceModal
          sale={selectedSaleForInvoice}
          settings={settings}
          onClose={() => setSelectedSaleForInvoice(null)}
        />
      )}

      {selectedSaleForReceipt && (
        <Receipt
          sale={selectedSaleForReceipt}
          settings={settings}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}

      {selectedSaleForWaybill && (
        <WaybillModal
          sale={selectedSaleForWaybill}
          settings={settings}
          onClose={() => setSelectedSaleForWaybill(null)}
        />
      )}
    </div>
  );
}