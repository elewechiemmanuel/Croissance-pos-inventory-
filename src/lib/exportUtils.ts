import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Export data array to an Excel (.xlsx) file
 */
export function exportToExcel(data: any[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Export data array to a structured PDF document
 */
export function exportToPDF(title: string, columns: string[], data: any[][], fileName: string) {
  const doc = new jsPDF();

  // Document Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);

  // Timestamp
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

  // Generate Table
  autoTable(doc, {
    startY: 35,
    head: [columns],
    body: data,
    theme: "grid",
    headStyles: { fillColor: [30, 58, 138] }, // Matches your blue theme
    styles: { fontSize: 9 },
  });

  doc.save(`${fileName}.pdf`);
}