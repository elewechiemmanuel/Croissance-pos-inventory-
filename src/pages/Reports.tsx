import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Queries the "sales" collection in real-time, ordered by newest first
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
  }, []);

  // --- EXPORT TO EXCEL ---
  const exportToExcel = () => {
    const dataToExport = sales.map((sale, index) => ({
      "S/N": index + 1,
      "Transaction ID": sale.transactionId || sale.id,
      "Total Amount (₦)": sale.totalAmount || sale.total || 0,
      "Payment Method": sale.paymentMethod || "Cash",
      "Date": sale.createdAt?.toDate?.() ? sale.createdAt.toDate().toLocaleString() : "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Reports");
    XLSX.writeFile(workbook, "Croissance_Sales_Report.xlsx");
  };

  // --- EXPORT TO PDF ---
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title header
    doc.setFontSize(18);
    doc.text("Croissance POS - Sales Report", 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    // Table mapping
    const tableColumn = ["S/N", "Transaction ID", "Total Amount (₦)", "Payment Method", "Date"];
    const tableRows = sales.map((sale, index) => [
      index + 1,
      sale.transactionId || sale.id,
      `₦${(sale.totalAmount || sale.total || 0).toLocaleString()}`,
      sale.paymentMethod || "Cash",
      sale.createdAt?.toDate?.() ? sale.createdAt.toDate().toLocaleString() : "N/A"
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] }, // Professional blue header
    });

    doc.save("Croissance_Sales_Report.pdf");
  };

  if (loading) return <div style={{ padding: "20px" }}>Loading reports...</div>;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Sales Reports & History</h2>
        
        {/* Export Action Buttons */}
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
              <th>Date</th>
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
                  <td>{sale.createdAt?.toDate?.() ? sale.createdAt.toDate().toLocaleString() : "Just now"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}