import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "../store/AuthContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setSales(salesList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Robust helper to completely resolve the "Just now" bug and malformed strings
  const formatSaleDate = (sale: any) => {
    const rawDate = sale.createdAt || sale.date || sale.timestamp;
    
    // If the database stored a literal string like "Just now" or invalid text, 
    // handle it safely instead of letting new Date() break or display incorrectly.
    if (!rawDate) return "N/A";
    if (typeof rawDate === "string" && (rawDate.toLowerCase() === "just now" || isNaN(Date.parse(rawDate)))) {
      // Fallbacks if a transaction has a legacy placeholder string
      return sale.updatedAt ? new Date(sale.updatedAt).toLocaleString() : "Recent";
    }

    let date: Date;

    // If it's a Firestore Timestamp object with .toDate()
    if (typeof rawDate.toDate === "function") {
      date = rawDate.toDate();
    } 
    // If it's an object with seconds (serialized Firestore timestamp)
    else if (typeof rawDate === "object" && typeof rawDate.seconds === "number") {
      date = new Date(rawDate.seconds * 1000);
    } 
    else {
      date = new Date(rawDate);
    }

    if (isNaN(date.getTime())) return "N/A";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  // --- EXPORT TO EXCEL ---
  const exportToExcel = () => {
    if (!isAdmin) return;
    const dataToExport = sales.map((sale, index) => ({
      "S/N": index + 1,
      "Transaction ID": sale.transactionId || sale.id,
      "Total Amount (₦)": sale.totalAmount || sale.total || 0,
      "Payment Method": sale.paymentMethod || "Cash",
      "Date": formatSaleDate(sale)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Reports");
    XLSX.writeFile(workbook, "Croissance_Sales_Report.xlsx");
  };

  // --- EXPORT TO PDF ---
  const exportToPDF = () => {
    if (!isAdmin) return;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Croissance POS - Sales Report", 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    const tableColumn = ["S/N", "Transaction ID", "Total Amount (₦)", "Payment Method", "Date"];
    const tableRows = sales.map((sale, index) => [
      index + 1,
      sale.transactionId || sale.id,
      `₦${(sale.totalAmount || sale.total || 0).toLocaleString()}`,
      sale.paymentMethod || "Cash",
      formatSaleDate(sale)
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save("Croissance_Sales_Report.pdf");
  };

  // --- SECURITY BLOCK FOR NON-ADMINS ---
  if (!isAdmin) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", color: "#c53030", padding: "30px", borderRadius: "8px", maxWidth: "450px", margin: "0 auto", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ marginBottom: "10px", fontSize: "20px" }}>Access Restricted</h2>
          <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
            You do not have permission to view sensitive financial reports and sales metrics. Only administrators are authorized to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: "20px" }}>Loading reports...</div>;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Sales Reports & History</h2>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={exportToExcel} 
            style={{ padding: "8px 15px", background: "#27ae60", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
          >
            Export Excel
          </button>
          <button 
            onClick={exportToPDF} 
            style={{ padding: "8px 15px", background: "#c0392b", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
          >
            Export PDF
          </button>
        </div>
      </div>

      <p style={{ marginBottom: "15px", color: "#555" }}>Total Recorded Transactions: <strong>{sales.length}</strong></p>
      
      <div style={{ overflowX: "auto" }}>
        <table border={1} cellPadding={10} style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
              <th>Transaction ID</th>
              <th>Total Amount</th>
              <th>Payment Method</th>
              <th>Date &amp; Time</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "#777" }}>
                  No sales transactions recorded yet. Complete a sale from the POS terminal to see it here!
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id}>
                  <td style={{ fontWeight: "500" }}>{sale.transactionId || sale.id}</td>
                  <td>₦{(sale.totalAmount || sale.total || 0).toLocaleString()}</td>
                  <td>{sale.paymentMethod || "Cash"}</td>
                  <td>{formatSaleDate(sale)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}