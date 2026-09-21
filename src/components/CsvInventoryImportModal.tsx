import React, { useState, useRef } from "react";
import { Product } from "../types";
import { formatCurrency } from "../lib/utils";
import { 
  parseInventoryCsv, 
  generateSampleInventoryCsv, 
  exportInventoryToCsv, 
  downloadCsvFile,
  ParsedCsvProduct 
} from "../lib/csvHelper";
import { apiCall } from "../lib/api";
import { 
  UploadCloud, 
  Download, 
  FileSpreadsheet, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  RefreshCw, 
  Layers, 
  ArrowRight,
  TrendingUp,
  Package,
  Search,
  Check,
  Filter
} from "lucide-react";

interface CsvInventoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  onImportComplete: (summary: { added: number; updated: number }) => Promise<void>;
}

type ImportMode = "upsert" | "stockOnly" | "addOnly";

export default function CsvInventoryImportModal({
  isOpen,
  onClose,
  existingProducts,
  onImportComplete
}: CsvInventoryImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvRawText, setCsvRawText] = useState<string>("");
  const [parsedData, setParsedData] = useState<{
    items: ParsedCsvProduct[];
    totalRows: number;
    validCount: number;
    errorCount: number;
    newCount: number;
    updateCount: number;
  } | null>(null);

  const [mode, setMode] = useState<ImportMode>("upsert");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NEW" | "UPDATE" | "WARNING">("ALL");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<{ added: number; updated: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith(".csv") && selectedFile.type !== "text/csv" && selectedFile.type !== "application/vnd.ms-excel") {
      setErrorMessage("Please upload a valid .csv file.");
      return;
    }

    setErrorMessage(null);
    setSuccessReport(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvRawText(text);
      try {
        const result = parseInventoryCsv(text, existingProducts);
        setParsedData(result);
        // Default select all valid items
        const validIndices = new Set<number>();
        result.items.forEach((item, idx) => {
          if (item.errors.length === 0) {
            validIndices.add(idx);
          }
        });
        setSelectedRowIds(validIndices);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to parse CSV file format.");
        setParsedData(null);
      }
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read the selected file.");
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadSample = () => {
    const sampleCsv = generateSampleInventoryCsv();
    downloadCsvFile(sampleCsv, "croissance_inventory_sample_template.csv");
  };

  const handleExportCurrent = () => {
    const csvContent = exportInventoryToCsv(existingProducts);
    const dateStr = new Date().toISOString().split("T")[0];
    downloadCsvFile(csvContent, `croissance_inventory_export_${dateStr}.csv`);
  };

  const handleToggleRow = (idx: number) => {
    const next = new Set(selectedRowIds);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedRowIds(next);
  };

  const handleToggleAll = () => {
    if (!parsedData) return;
    if (selectedRowIds.size === parsedData.items.length) {
      setSelectedRowIds(new Set());
    } else {
      const all = new Set<number>();
      parsedData.items.forEach((item, idx) => {
        if (item.errors.length === 0) all.add(idx);
      });
      setSelectedRowIds(all);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedData) return;

    const itemsToImport = parsedData.items.filter((_, idx) => selectedRowIds.has(idx));
    if (itemsToImport.length === 0) {
      setErrorMessage("Please select at least one valid product row to import.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: itemsToImport.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          type: item.type,
          salesType: item.salesType,
          unit: item.unit,
          buyingPrice: item.buyingPrice,
          sellingPrice: item.sellingPrice,
          wholesalePrice: item.wholesalePrice,
          currentStock: item.currentStock,
          openingStock: item.openingStock,
          minStock: item.minStock,
          status: item.status
        })),
        mode
      };

      const res = await apiCall("batchImportProducts", payload);
      const added = res.addedCount || 0;
      const updated = res.updatedCount || 0;

      setSuccessReport({ added, updated });
      await onImportComplete({ added, updated });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process inventory import.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCsvRawText("");
    setParsedData(null);
    setSelectedRowIds(new Set());
    setErrorMessage(null);
    setSuccessReport(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Filtered rows for the preview table
  const displayedRows = (parsedData?.items || []).map((item, idx) => ({ item, originalIdx: idx })).filter(({ item }) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.unit.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === "NEW") return !item.isExisting;
    if (statusFilter === "UPDATE") return item.isExisting;
    if (statusFilter === "WARNING") return item.warnings.length > 0 || item.errors.length > 0;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Import Inventory Data via CSV</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Bulk upload fuel products, stock quantities, and retail & wholesale prices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSample}
              className="px-3 py-1.5 bg-blue-800/80 hover:bg-blue-700 text-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-700 cursor-pointer"
              title="Download clean CSV sample formatted for Croissance Oil & Gas"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Sample Template</span>
            </button>

            <button
              onClick={handleExportCurrent}
              className="px-3 py-1.5 bg-blue-800/80 hover:bg-blue-700 text-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-700 cursor-pointer"
              title="Export all current products to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Current</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Import Error: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successReport && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-emerald-950">Inventory Import Succeeded!</p>
                  <p className="text-emerald-700 mt-0.5">
                    <strong>{successReport.added}</strong> new product(s) added, and <strong>{successReport.updated}</strong> existing product(s) updated successfully.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs"
              >
                Close & View Products
              </button>
            </div>
          )}

          {/* File Upload Zone (Shown if no file uploaded yet or to swap file) */}
          {!parsedData ? (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver 
                    ? "border-amber-500 bg-amber-50/60 scale-[1.01]" 
                    : "border-gray-200 bg-gray-50/50 hover:bg-blue-50/30 hover:border-blue-300"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                  accept=".csv,text/csv"
                  className="hidden"
                />
                <div className="w-14 h-14 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <UploadCloud className="w-7 h-7 text-blue-800" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  Drag and drop your Inventory CSV file here
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Click to browse from your computer. Files generated by Excel, Google Sheets, or point-of-sale systems are supported.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-2xs">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    .CSV Format
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-blue-800 font-medium hover:underline">
                    Browse files
                  </span>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Step 1</span>
                  <p className="text-xs font-bold text-gray-900 mt-0.5">Download Sample</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Click <strong>Sample Template</strong> above to get a pre-formatted spreadsheet with standard oil & gas columns.
                  </p>
                </div>
                <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Step 2</span>
                  <p className="text-xs font-bold text-gray-900 mt-0.5">Fill In Your Stock</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Enter product names, units (Litre, KG, Unit), cost prices, selling prices, and current stock readings.
                  </p>
                </div>
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Step 3</span>
                  <p className="text-xs font-bold text-gray-900 mt-0.5">Upload & Preview</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Review price adjustments and new additions in the interactive table before committing.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Parsed Data Preview & Configuration State */
            <div className="space-y-4">
              {/* File Info Bar + Mode Selectors */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{file?.name || "Uploaded CSV"}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                        {parsedData.totalRows} Rows Read
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ready to process {selectedRowIds.size} selected item(s)
                    </p>
                  </div>
                </div>

                {/* Import Mode Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">Import Mode:</span>
                  <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setMode("upsert")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        mode === "upsert" 
                          ? "bg-blue-900 text-white shadow-xs" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      title="Update matching products and add new products"
                    >
                      Update & Add (Upsert)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("stockOnly")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        mode === "stockOnly" 
                          ? "bg-blue-900 text-white shadow-xs" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      title="Only update current stock counts of existing products"
                    >
                      Stock Take Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("addOnly")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        mode === "addOnly" 
                          ? "bg-blue-900 text-white shadow-xs" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      title="Only add new products, ignore existing items"
                    >
                      Add New Only
                    </button>
                  </div>

                  <button
                    onClick={handleReset}
                    className="text-xs text-red-600 hover:underline px-2 py-1 ml-1"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* KPI Breakdown Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">Total Rows</span>
                    <span className="text-lg font-bold text-blue-950 mt-0.5 block">{parsedData.totalRows}</span>
                  </div>
                  <Package className="w-5 h-5 text-blue-400" />
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">New Products</span>
                    <span className="text-lg font-bold text-emerald-950 mt-0.5 block">+{parsedData.newCount}</span>
                  </div>
                  <Layers className="w-5 h-5 text-emerald-500" />
                </div>

                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Matched Updates</span>
                    <span className="text-lg font-bold text-amber-950 mt-0.5 block">{parsedData.updateCount}</span>
                  </div>
                  <RefreshCw className="w-5 h-5 text-amber-500" />
                </div>

                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-700 block">Selected</span>
                    <span className="text-lg font-bold text-purple-950 mt-0.5 block">{selectedRowIds.size}</span>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-purple-500" />
                </div>
              </div>

              {/* Table Toolbar: Filter & Search */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search parsed items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setStatusFilter("ALL")}
                      className={`px-2.5 py-1 rounded-md font-medium ${statusFilter === "ALL" ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-600"}`}
                    >
                      All ({parsedData.items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("NEW")}
                      className={`px-2.5 py-1 rounded-md font-medium ${statusFilter === "NEW" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-gray-600"}`}
                    >
                      New (+{parsedData.newCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("UPDATE")}
                      className={`px-2.5 py-1 rounded-md font-medium ${statusFilter === "UPDATE" ? "bg-white text-amber-700 shadow-2xs font-bold" : "text-gray-600"}`}
                    >
                      Updates ({parsedData.updateCount})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="text-xs text-blue-900 font-semibold hover:underline"
                  >
                    {selectedRowIds.size === parsedData.items.length ? "Deselect All" : "Select All Valid"}
                  </button>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100/80 sticky top-0 z-10 border-b border-gray-200 text-gray-600 font-semibold">
                    <tr>
                      <th className="p-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.size === parsedData.items.length && parsedData.items.length > 0}
                          onChange={handleToggleAll}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                      </th>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Mode</th>
                      <th className="p-2.5">Unit</th>
                      <th className="p-2.5 text-right">Cost Price</th>
                      <th className="p-2.5 text-right">Retail Price</th>
                      <th className="p-2.5 text-right">Wholesale</th>
                      <th className="p-2.5 text-right">Stock Level</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-6 text-center text-gray-400">
                          No matching product rows found.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map(({ item, originalIdx }) => {
                        const isSelected = selectedRowIds.has(originalIdx);
                        const hasError = item.errors.length > 0;
                        const hasWarning = item.warnings.length > 0;

                        return (
                          <tr 
                            key={originalIdx} 
                            className={`hover:bg-blue-50/40 transition-colors ${
                              !isSelected ? "opacity-50 bg-gray-50/40" : ""
                            } ${hasError ? "bg-red-50/40" : ""}`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                disabled={hasError}
                                checked={isSelected}
                                onChange={() => handleToggleRow(originalIdx)}
                                className="rounded text-amber-600 focus:ring-amber-500 disabled:opacity-30"
                              />
                            </td>
                            <td className="p-2.5 text-gray-400 font-mono text-[11px]">
                              #{item.rowNumber}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              {hasError ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                                  Error
                                </span>
                              ) : item.isExisting ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-semibold">
                                  Update
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  + New
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-medium text-gray-900">
                              <div>
                                <span>{item.name}</span>
                                {hasError && (
                                  <p className="text-[10px] text-red-600 mt-0.5 font-normal">
                                    {item.errors.join(", ")}
                                  </p>
                                )}
                                {!hasError && hasWarning && (
                                  <p className="text-[10px] text-amber-600 mt-0.5 font-normal">
                                    {item.warnings.join(", ")}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-gray-600">
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px]">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-2.5 text-gray-600">
                              <span className={`text-[10px] font-semibold ${item.salesType === 'Wholesale' ? 'text-purple-700' : 'text-blue-700'}`}>
                                {item.salesType}
                              </span>
                            </td>
                            <td className="p-2.5 text-gray-600">{item.unit}</td>
                            <td className="p-2.5 text-right font-mono text-gray-700">
                              ₦{item.buyingPrice.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-mono text-gray-900 font-semibold">
                              ₦{item.sellingPrice.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-mono text-gray-700">
                              ₦{item.wholesalePrice.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-mono whitespace-nowrap">
                              {item.diff?.stockChange && item.diff.stockChange.old !== item.diff.stockChange.new ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-gray-400 line-through text-[10px]">
                                    {item.diff.stockChange.old.toLocaleString()}
                                  </span>
                                  <ArrowRight className="w-2.5 h-2.5 text-amber-600" />
                                  <span className="font-bold text-amber-700">
                                    {item.diff.stockChange.new.toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-semibold text-gray-900">
                                  {item.currentStock.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                item.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {parsedData && (
              <span>
                Ready to commit <strong>{selectedRowIds.size}</strong> product(s) to system database
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>

            {parsedData && (
              <button
                type="button"
                disabled={isProcessing || selectedRowIds.size === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Batch Import...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Import {selectedRowIds.size} Products Now</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
