import React, { useState, useMemo } from "react";
import { AuditLog, AuditActionType, AuditCategory, AuditSeverity } from "../types";
import { formatDate } from "../lib/utils";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  Package, 
  FileText, 
  Settings, 
  Users, 
  Eye, 
  X, 
  Clock, 
  MapPin, 
  Monitor, 
  Hash, 
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert
} from "lucide-react";

interface AuditLogViewerProps {
  auditLogs: AuditLog[];
  dateRangeLabel: string;
  isWithinDateRange: (dateStr: string) => boolean;
}

export default function AuditLogViewer({ auditLogs = [], dateRangeLabel, isWithinDateRange }: AuditLogViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [activeModalLog, setActiveModalLog] = useState<AuditLog | null>(null);

  // Filter by date range first
  const dateFilteredLogs = useMemo(() => {
    return auditLogs.filter(log => isWithinDateRange(log.timestamp));
  }, [auditLogs, isWithinDateRange]);

  // Comprehensive search and category filters
  const filteredLogs = useMemo(() => {
    return dateFilteredLogs.filter(log => {
      // Category filter
      if (selectedCategory !== "ALL" && log.category !== selectedCategory) return false;

      // Action filter
      if (selectedAction !== "ALL" && log.action !== selectedAction) return false;

      // Severity filter
      if (selectedSeverity !== "ALL" && log.severity !== selectedSeverity) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matches = 
          log.actorName?.toLowerCase().includes(q) ||
          log.actorEmail?.toLowerCase().includes(q) ||
          log.targetEntityName?.toLowerCase().includes(q) ||
          log.targetEntityId?.toLowerCase().includes(q) ||
          log.description?.toLowerCase().includes(q) ||
          log.reason?.toLowerCase().includes(q) ||
          log.terminalStation?.toLowerCase().includes(q) ||
          log.diffSummary?.toLowerCase().includes(q) ||
          log.action?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [dateFilteredLogs, selectedCategory, selectedAction, selectedSeverity, searchTerm]);

  // Aggregate KPI metrics
  const totalEvents = dateFilteredLogs.length;
  const priceChangeEvents = dateFilteredLogs.filter(l => l.action === "PRICE_CHANGE" || l.category === "PRICING").length;
  const stockAdjustEvents = dateFilteredLogs.filter(l => l.action === "STOCK_ADJUSTMENT" || l.category === "INVENTORY").length;
  const invoiceDeleteEvents = dateFilteredLogs.filter(l => l.action === "INVOICE_DELETED" || l.category === "INVOICES").length;
  const criticalEvents = dateFilteredLogs.filter(l => l.severity === "CRITICAL").length;

  const getSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">
            <AlertOctagon className="w-3 h-3 text-red-600" />
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
            <Info className="w-3 h-3 text-blue-600" />
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            LOW
          </span>
        );
    }
  };

  const getCategoryIcon = (category: AuditCategory) => {
    switch (category) {
      case "PRICING":
        return <TrendingUp className="w-3.5 h-3.5 text-amber-600" />;
      case "INVENTORY":
        return <Package className="w-3.5 h-3.5 text-blue-600" />;
      case "INVOICES":
        return <FileText className="w-3.5 h-3.5 text-red-600" />;
      case "SETTINGS":
        return <Settings className="w-3.5 h-3.5 text-purple-600" />;
      case "USERS":
        return <Users className="w-3.5 h-3.5 text-teal-600" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  const formatActionName = (action: string) => {
    return action.replace(/_/g, " ");
  };

  return (
    <div className="space-y-4">
      {/* Top Audit KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/70 border-b border-gray-100">
        <button
          onClick={() => { setSelectedCategory("ALL"); setSelectedAction("ALL"); setSelectedSeverity("ALL"); }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategory === "ALL" && selectedAction === "ALL" && selectedSeverity === "ALL"
              ? "bg-blue-900 text-white border-blue-900 shadow-xs" 
              : "bg-white text-gray-800 border-gray-200 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Total Audited Events</span>
            <ShieldCheck className="w-4 h-4 opacity-80" />
          </div>
          <p className="text-xl font-black mt-1">{totalEvents}</p>
          <span className="text-[10px] opacity-75">All recorded actions</span>
        </button>

        <button
          onClick={() => { setSelectedCategory("PRICING"); setSelectedAction("PRICE_CHANGE"); setSelectedSeverity("ALL"); }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedAction === "PRICE_CHANGE"
              ? "bg-amber-600 text-white border-amber-600 shadow-xs" 
              : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Price Revisions</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black mt-1">{priceChangeEvents}</p>
          <span className="text-[10px] opacity-75">Retail &amp; wholesale edits</span>
        </button>

        <button
          onClick={() => { setSelectedCategory("INVENTORY"); setSelectedAction("STOCK_ADJUSTMENT"); setSelectedSeverity("ALL"); }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedAction === "STOCK_ADJUSTMENT"
              ? "bg-blue-700 text-white border-blue-700 shadow-xs" 
              : "bg-white text-gray-800 border-gray-200 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Stock Calibrations</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black mt-1">{stockAdjustEvents}</p>
          <span className="text-[10px] opacity-75">Tank dips &amp; physical counts</span>
        </button>

        <button
          onClick={() => { setSelectedCategory("INVOICES"); setSelectedAction("INVOICE_DELETED"); setSelectedSeverity("ALL"); }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedAction === "INVOICE_DELETED"
              ? "bg-red-700 text-white border-red-700 shadow-xs" 
              : "bg-white text-gray-800 border-gray-200 hover:border-red-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Voided Invoices</span>
            <AlertOctagon className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-xl font-black mt-1 text-red-600">{invoiceDeleteEvents}</p>
          <span className="text-[10px] opacity-75">Deleted sales &amp; orders</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail by actor, product name, invoice #, reason, IP address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-600"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1.5 rounded-lg text-xs">
              <span className="text-gray-500 text-[11px] font-semibold">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedAction("ALL");
                }}
                className="bg-transparent border-none text-xs font-semibold text-gray-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="PRICING">Pricing &amp; Tariffs</option>
                <option value="INVENTORY">Inventory &amp; Tanks</option>
                <option value="INVOICES">Sales Invoices</option>
                <option value="SETTINGS">Company Settings</option>
                <option value="USERS">User Accounts</option>
              </select>
            </div>

            {/* Severity */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1.5 rounded-lg text-xs">
              <span className="text-gray-500 text-[11px] font-semibold">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-gray-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(searchTerm || selectedCategory !== "ALL" || selectedAction !== "ALL" || selectedSeverity !== "ALL") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("ALL");
                  setSelectedAction("ALL");
                  setSelectedSeverity("ALL");
                }}
                className="px-2.5 py-1.5 text-xs text-blue-700 hover:bg-blue-50 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Badges Bar */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-400 text-[11px] font-medium mr-1">Quick Filters:</span>
          {[
            { label: "All Logs", cat: "ALL", act: "ALL" },
            { label: "Price Adjustments", cat: "PRICING", act: "PRICE_CHANGE" },
            { label: "Stock Reconciliations", cat: "INVENTORY", act: "STOCK_ADJUSTMENT" },
            { label: "Deleted Invoices", cat: "INVOICES", act: "INVOICE_DELETED" },
            { label: "Bank Account Changes", cat: "SETTINGS", act: "BANK_DETAILS_UPDATED" },
            { label: "User Management", cat: "USERS", act: "ALL" }
          ].map(chip => {
            const isChipActive = selectedCategory === chip.cat && selectedAction === chip.act;
            return (
              <button
                key={chip.label}
                onClick={() => {
                  setSelectedCategory(chip.cat);
                  setSelectedAction(chip.act);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                  isChipActive 
                    ? "bg-blue-900 text-white font-bold" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-y border-gray-200">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Event / Action</th>
              <th className="px-4 py-3">Responsible User</th>
              <th className="px-4 py-3">Target Entity</th>
              <th className="px-4 py-3">Description &amp; Reason</th>
              <th className="px-4 py-3">Diff / Impact Summary</th>
              <th className="px-4 py-3 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-500">
                  <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700">No audit events match current criteria</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try adjusting the search query, category filters, or selected date range.
                  </p>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                return (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                    {/* Timestamp */}
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium text-gray-900">
                        {new Date(log.timestamp).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {new Date(log.timestamp).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3">
                      {getSeverityBadge(log.severity)}
                    </td>

                    {/* Action & Category */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                        {getCategoryIcon(log.category)}
                        <span>{formatActionName(log.action)}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mt-0.5">
                        {log.category}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <span>{log.actorName}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                          log.actorRole === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {log.actorRole || "Staff"}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{log.terminalStation || "Admin Office"}</span>
                        {log.ipAddress && (
                          <span className="text-gray-400 text-[10px] font-mono">({log.ipAddress})</span>
                        )}
                      </div>
                    </td>

                    {/* Target Entity */}
                    <td className="px-4 py-3 text-xs">
                      <div className="font-bold text-blue-900 font-mono">
                        {log.targetEntityName}
                      </div>
                      <span className="text-[11px] text-gray-400">
                        ID: {log.targetEntityId}
                      </span>
                    </td>

                    {/* Description & Reason */}
                    <td className="px-4 py-3 text-xs max-w-xs whitespace-normal">
                      <p className="text-gray-800 font-medium leading-snug">
                        {log.description}
                      </p>
                      {log.reason && (
                        <p className="text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded text-[11px] mt-1 inline-block border border-amber-200">
                          <strong>Reason:</strong> {log.reason}
                        </p>
                      )}
                    </td>

                    {/* Diff / Impact Summary */}
                    <td className="px-4 py-3 text-xs max-w-xs whitespace-normal">
                      {log.diffSummary ? (
                        <div className="bg-gray-50 p-1.5 rounded border border-gray-200 text-gray-700 font-mono text-[11px] leading-tight">
                          {log.diffSummary}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Inspect Button */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveModalLog(log)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 mx-auto shadow-2xs"
                        title="View complete audit evidence"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-700" />
                        <span>Evidence</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info Banner */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-900" />
          <span>
            Showing <strong>{filteredLogs.length}</strong> of <strong>{auditLogs.length}</strong> total compliance audit records.
          </span>
        </div>
        <div className="text-[11px] text-gray-400">
          Immutable audit trail automatically synchronized across station terminals.
        </div>
      </div>

      {/* EVIDENCE / AUDIT DETAIL MODAL */}
      {activeModalLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto border border-gray-200 animate-in fade-in zoom-in-95 max-h-[90vh]">
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              activeModalLog.severity === "CRITICAL" ? "bg-red-700" :
              activeModalLog.severity === "HIGH" ? "bg-amber-600" : "bg-blue-900"
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  {activeModalLog.severity === "CRITICAL" ? (
                    <AlertOctagon className="w-5 h-5 text-white" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>Audit Record {activeModalLog.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 uppercase font-mono">
                      {activeModalLog.severity}
                    </span>
                  </h3>
                  <p className="text-xs opacity-90">
                    Action: {formatActionName(activeModalLog.action)} • Category: {activeModalLog.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalLog(null)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500 block mb-0.5">Recorded Timestamp:</span>
                  <span className="font-semibold text-gray-900">{formatDate(activeModalLog.timestamp)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Responsible Actor:</span>
                  <span className="font-bold text-gray-900">{activeModalLog.actorName}</span>{" "}
                  <span className="text-purple-700 uppercase font-bold text-[10px]">[{activeModalLog.actorRole}]</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Email &amp; Terminal:</span>
                  <span className="text-gray-700">{activeModalLog.actorEmail || "N/A"} • {activeModalLog.terminalStation || "Admin Office"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Network IP &amp; Origin:</span>
                  <span className="font-mono text-gray-700">{activeModalLog.ipAddress || "127.0.0.1"}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-500 block mb-0.5">Target Entity:</span>
                  <span className="font-bold text-blue-950 font-mono text-sm">{activeModalLog.targetEntityName}</span>{" "}
                  <span className="text-gray-400">({activeModalLog.targetEntityId})</span>
                </div>
              </div>

              {/* Description and Justification */}
              <div className="space-y-2">
                <div>
                  <span className="text-gray-500 font-bold block mb-1">Audit Description:</span>
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-950 font-medium">
                    {activeModalLog.description}
                  </div>
                </div>

                {activeModalLog.reason && (
                  <div>
                    <span className="text-gray-500 font-bold block mb-1">Stated Compliance Reason:</span>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 font-semibold">
                      "{activeModalLog.reason}"
                    </div>
                  </div>
                )}
              </div>

              {/* Diff / Value Comparison */}
              {(activeModalLog.previousValue !== undefined || activeModalLog.newValue !== undefined) && (
                <div>
                  <span className="text-gray-500 font-bold block mb-1">State Transition Snapshot:</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-red-800 mb-1 flex items-center gap-1">
                        <span>Previous State (Before)</span>
                      </div>
                      <pre className="text-[11px] font-mono text-red-950 whitespace-pre-wrap break-words overflow-x-auto max-h-40 bg-white p-2 rounded border border-red-100">
                        {activeModalLog.previousValue ? JSON.stringify(activeModalLog.previousValue, null, 2) : "None / Created"}
                      </pre>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-emerald-800 mb-1 flex items-center gap-1">
                        <span>New State (After)</span>
                      </div>
                      <pre className="text-[11px] font-mono text-emerald-950 whitespace-pre-wrap break-words overflow-x-auto max-h-40 bg-white p-2 rounded border border-emerald-100">
                        {activeModalLog.newValue ? JSON.stringify(activeModalLog.newValue, null, 2) : "None / Deleted"}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Diff Summary */}
              {activeModalLog.diffSummary && (
                <div>
                  <span className="text-gray-500 font-bold block mb-1">Calculated Impact &amp; Variance:</span>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-gray-800 font-semibold">
                    {activeModalLog.diffSummary}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModalLog(null)}
                className="px-5 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-colors cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
