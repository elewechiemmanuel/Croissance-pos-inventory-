import React, {
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { DataContext } from "../components/Layout";
import { Sale } from "../types";
import { formatDate } from "../lib/utils";
import { downloadInvoicePdf, printInvoice } from "../lib/invoiceGenerator";
import InvoiceModal from "../components/InvoiceModal";
import Receipt from "../components/Receipt";
import WaybillModal from "../components/WaybillModal";
import { db } from "../firebase";

import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  QueryConstraint,
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
  Loader2,
} from "lucide-react";

import { Link } from "react-router-dom";

type StatusFilter = "ALL" | "Paid" | "Pending";

const ITEMS_PER_PAGE = 10;

const formatNaira = (amount: number | undefined | null): string => {
  const value = Number(amount ?? 0);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
};

const normalizeStatus = (status?: string): string => {
  const value = String(status ?? "").trim().toLowerCase();

  if (
    value === "paid" ||
    value === "completed" ||
    value === "settled"
  ) {
    return "Paid";
  }

  if (
    value === "pending" ||
    value === "part-paid" ||
    value === "part paid" ||
    value === "unpaid"
  ) {
    return "Pending";
  }

  return status || "Paid";
};

const getDateValue = (value: unknown): string => {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (
        value as {
          toDate: () => Date;
        }
      ).toDate().toISOString();
    } catch {
      return "";
    }
  }

  return "";
};

export default function Invoices() {
  const contextData = useContext(DataContext);

  const settings = contextData?.settings;

  // Firestore Data
  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [allMatchingInvoices, setAllMatchingInvoices] = useState<Sale[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] =
    useState<Sale | null>(null);

  const [selectedSaleForReceipt, setSelectedSaleForReceipt] =
    useState<Sale | null>(null);

  const [selectedSaleForWaybill, setSelectedSaleForWaybill] =
    useState<Sale | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(
    null
  );

  /**
   * Fetch invoices from Firestore.
   */
  const fetchFirebaseInvoices = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const invoicesRef = collection(db, "sales");

      const constraints: QueryConstraint[] = [];

      /*
       * Status filter.
       *
       * We handle "Completed" and "Paid" together on the client
       * because older records may use either value.
       */
      if (statusFilter === "Paid") {
        // Do not add Firestore status filtering here.
        // This allows both "Paid" and legacy "Completed" records.
      }

      if (statusFilter === "Pending") {
        // Also handled client-side so "Pending", "Part-Paid"
        // and "Unpaid" can all be displayed consistently.
      }

      /*
       * Date filtering.
       *
       * Dates are stored as strings in the current Sale structure.
       * We use YYYY-MM-DD boundaries.
       */
      if (startDate) {
        constraints.push(where("date", ">=", startDate));
      }

      if (endDate) {
        /*
         * Because Firestore values may contain timestamps such as:
         * 2026-09-25T14:30:00
         *
         * using "endDate + \uf8ff" includes the entire selected day
         * when the date is stored as a string.
         */
        constraints.push(
          where("date", "<=", `${endDate}\uf8ff`)
        );
      }

      constraints.push(orderBy("date", "desc"));

      const invoicesQuery = query(
        invoicesRef,
        ...constraints
      );

      const snapshot = await getDocs(invoicesQuery);

      const fetchedInvoices: Sale[] = [];

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Sale;

        fetchedInvoices.push({
          ...data,
          id: docSnapshot.id,
          items: Array.isArray(data.items) ? data.items : [],
        });
      });

      setAllMatchingInvoices(fetchedInvoices);
    } catch (error) {
      console.error(
        "Error fetching invoices from Firebase:",
        error
      );

      setAllMatchingInvoices([]);
      setErrorMessage(
        "Unable to load invoices. Please check your Firebase connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, statusFilter]);

  useEffect(() => {
    fetchFirebaseInvoices();
  }, [fetchFirebaseInvoices]);

  /**
   * Apply search and status filtering locally.
   */
  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allMatchingInvoices.filter((sale) => {
      const normalizedStatus = normalizeStatus(
        sale.paymentStatus
      );

      const matchesStatus =
        statusFilter === "ALL" ||
        normalizedStatus === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const invoiceNumber = String(
        sale.invoiceNumber ?? ""
      ).toLowerCase();

      const customerName = String(
        sale.customerName ?? ""
      ).toLowerCase();

      const customerPhone = String(
        sale.customerPhone ?? ""
      ).toLowerCase();

      const staffName = String(
        sale.staffName ?? ""
      ).toLowerCase();

      return (
        invoiceNumber.includes(term) ||
        customerName.includes(term) ||
        customerPhone.includes(term) ||
        staffName.includes(term)
      );
    });
  }, [allMatchingInvoices, searchTerm, statusFilter]);

  /**
   * Reset to page 1 whenever search/filter changes.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate]);

  /**
   * Summary statistics.
   */
  const totalInvoicesCount = filteredInvoices.length;

  const totalInvoicedVolume = useMemo(() => {
    return filteredInvoices.reduce((sum, sale) => {
      const amount = Number(sale.totalAmount ?? 0);

      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [filteredInvoices]);

  const completedCount = useMemo(() => {
    return filteredInvoices.filter(
      (sale) => normalizeStatus(sale.paymentStatus) === "Paid"
    ).length;
  }, [filteredInvoices]);

  /**
   * Pagination.
   */
  const totalPages =
    Math.ceil(totalInvoicesCount / ITEMS_PER_PAGE) || 1;

  const paginatedInvoices = useMemo(() => {
    const startIndex =
      (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredInvoices.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
  }, [filteredInvoices, currentPage]);

  /**
   * Make sure current page remains valid if filters reduce
   * the number of pages.
   */
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /**
   * Download invoice PDF.
   */
  const handleQuickDownload = async (
    sale: Sale,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    if (downloadingId) {
      return;
    }

    setDownloadingId(sale.id);

    try {
      await downloadInvoicePdf(sale, settings);

      window.setTimeout(() => {
        setDownloadingId(null);
      }, 1500);
    } catch (error) {
      console.error(
        "Failed to download invoice PDF:",
        error
      );

      setDownloadingId(null);

      window.alert(
        "Unable to download the invoice PDF. Please try again."
      );
    }
  };

  /**
   * Print invoice.
   */
  const handleQuickPrint = async (
    sale: Sale,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    try {
      await printInvoice(sale, settings);
    } catch (error) {
      console.error(
        "Failed to print invoice:",
        error
      );

      window.alert(
        "Unable to print the invoice. Please try again."
      );
    }
  };

  /**
   * Validate date range.
   */
  const dateRangeIsInvalid =
    Boolean(startDate && endDate && startDate > endDate);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2.5">
            <FileText className="text-amber-500 w-7 h-7" />
            Invoices Management
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            View, generate, print and download official
            commercial &amp; tax invoices in PDF
          </p>
        </div>

        <Link
          to="/pos"
          className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>Create New Sale / Invoice</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Invoices
          </p>

          <p className="text-2xl font-bold text-blue-900 mt-1">
            {totalInvoicesCount}
          </p>

          <p className="text-xs text-gray-400 mt-0.5">
            Matching current filters
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
            Total Invoiced Volume
          </p>

          <p className="text-2xl font-bold text-blue-700 mt-1">
            {formatNaira(totalInvoicedVolume)}
          </p>

          <p className="text-xs text-blue-600/80 mt-0.5">
            Commercial value generated
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm bg-gradient-to-br from-green-50/50 to-white">
          <p className="text-xs font-semibold text-green-900 uppercase tracking-wider">
            Completed / Settled
          </p>

          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {completedCount}
          </p>

          <p className="text-xs text-emerald-600/80 mt-0.5">
            Fully paid &amp; reconciled
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              placeholder="Search by Invoice #, Customer, Phone, Attendant..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">
              Status:
            </span>

            <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
              {(["ALL", "Paid", "Pending"] as StatusFilter[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(status);
                    }}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      statusFilter === status
                        ? "bg-white text-blue-900 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {status === "ALL"
                      ? "All Invoices"
                      : status}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />

            <span className="text-gray-500 font-medium">
              From:
            </span>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
              }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">
              To:
            </span>

            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
              }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-blue-600 hover:underline font-semibold ml-auto cursor-pointer"
            >
              Clear Dates
            </button>
          )}
        </div>

        {dateRangeIsInvalid && (
          <p className="text-xs text-red-600 font-medium">
            The end date cannot be earlier than the start
            date.
          </p>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Invoice Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-700 animate-spin" />

              <span className="text-xs font-medium text-gray-500">
                Loading invoices...
              </span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">
                  Invoice #
                </th>

                <th className="px-5 py-3.5">
                  Date
                </th>

                <th className="px-5 py-3.5">
                  Customer
                </th>

                <th className="px-5 py-3.5">
                  Items
                </th>

                <th className="px-5 py-3.5">
                  Payment
                </th>

                <th className="px-5 py-3.5 text-right">
                  Total Amount
                </th>

                <th className="px-5 py-3.5 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedInvoices.map((sale) => {
                const status = normalizeStatus(
                  sale.paymentStatus
                );

                return (
                  <tr
                    key={sale.id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Invoice Number */}
                    <td className="px-5 py-4 font-bold text-blue-900">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSaleForInvoice(sale)
                        }
                        className="hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-500" />

                        {sale.invoiceNumber ||
                          "N/A"}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {sale.date
                        ? formatDate(
                            getDateValue(sale.date)
                          )
                        : "N/A"}
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4 font-medium text-gray-800">
                      <div>
                        {sale.customerName ||
                          "Walk-in Customer"}
                      </div>

                      {sale.customerPhone && (
                        <div className="text-[11px] text-gray-400">
                          {sale.customerPhone}
                        </div>
                      )}
                    </td>

                    {/* Items */}
                    <td className="px-5 py-4 text-xs text-gray-600">
                      <div>
                        {sale.items?.length || 0}{" "}
                        item
                        {(sale.items?.length || 0) !==
                        1
                          ? "s"
                          : ""}
                      </div>

                      <span className="text-gray-400 block text-[11px] truncate max-w-[180px]">
                        {(sale.items || [])
                          .map(
                            (item) =>
                              `${item.quantity}x ${item.productName}`
                          )
                          .join(", ")}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 uppercase">
                        {sale.paymentMethod ||
                          "Cash"}
                      </span>

                      <span
                        className={`ml-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                          status === "Paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {status}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 text-right font-bold text-base text-blue-950">
                      {formatNaira(
                        sale.totalAmount
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Download */}
                        <button
                          type="button"
                          onClick={(e) =>
                            handleQuickDownload(
                              sale,
                              e
                            )
                          }
                          disabled={
                            downloadingId !== null
                          }
                          className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download Invoice PDF"
                        >
                          {downloadingId ===
                          sale.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        {/* Print */}
                        <button
                          type="button"
                          onClick={(e) =>
                            handleQuickPrint(
                              sale,
                              e
                            )
                          }
                          className="p-1.5 text-gray-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Print A4 Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* View Invoice */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSaleForInvoice(
                              sale
                            )
                          }
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="View Full Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />

                          <span>View</span>
                        </button>

                        {/* Waybill */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSaleForWaybill(
                              sale
                            )
                          }
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                          title="Generate / View Waybill"
                        >
                          <Truck className="w-3.5 h-3.5" />

                          <span className="hidden lg:inline">
                            Waybill
                          </span>
                        </button>

                        {/* Receipt */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSaleForReceipt(
                              sale
                            )
                          }
                          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Print / View Thermal Receipt"
                        >
                          <ReceiptIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!isLoading &&
                paginatedInvoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-gray-400"
                    >
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />

                      <p className="font-semibold text-gray-600 text-base">
                        No Invoices Found
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        Try adjusting your search
                        criteria or date filters.
                      </p>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalInvoicesCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
            <div>
              Showing{" "}
              <span className="font-semibold">
                {(currentPage - 1) *
                    ITEMS_PER_PAGE +
                  1}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  totalInvoicesCount
                )}
              </span>{" "}
              of{" "}
              <span className="font-semibold">
                {totalInvoicesCount}
              </span>{" "}
              entries
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(page - 1, 1)
                  )
                }
                disabled={
                  currentPage === 1 || isLoading
                }
                className="p-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-medium text-gray-700">
                Page {currentPage} of{" "}
                {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(
                      page + 1,
                      totalPages
                    )
                  )
                }
                disabled={
                  currentPage === totalPages ||
                  isLoading
                }
                className="p-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedSaleForInvoice && (
        <InvoiceModal
          sale={selectedSaleForInvoice}
          settings={settings}
          onClose={() =>
            setSelectedSaleForInvoice(null)
          }
        />
      )}

      {/* Receipt Modal */}
      {selectedSaleForReceipt && (
        <Receipt
          sale={selectedSaleForReceipt}
          settings={settings}
          onClose={() =>
            setSelectedSaleForReceipt(null)
          }
        />
      )}

      {/* Waybill Modal */}
      {selectedSaleForWaybill && (
        <WaybillModal
          sale={selectedSaleForWaybill}
          settings={settings}
          onClose={() =>
            setSelectedSaleForWaybill(null)
          }
        />
      )}
    </div>
  );
}