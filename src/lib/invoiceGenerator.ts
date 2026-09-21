import { Sale, Settings } from "../types";
import { formatCurrency, formatDate } from "./utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { executePrint } from "./printerService";

export function generateInvoiceHtml(sale: Sale, settings: Settings): string {
  const itemsRows = sale.items.map((item, idx) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${idx + 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${item.productName}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #4b5563;">${item.unit || "Unit"}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: #111827;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; color: #111827;">${formatCurrency(item.total)}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Commercial Invoice - ${sale.invoiceNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .company-name { font-size: 22px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; text-transform: uppercase; }
          .doc-title { font-size: 24px; font-weight: 900; color: #1e3a8a; text-align: right; letter-spacing: 1px; }
          .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-paid { background: #dcfce7; color: #15803d; }
          .badge-pending { background: #fef3c7; color: #b45309; }
          .info-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 20px;
          }
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table.items-table th {
            background: #1e3a8a;
            color: #ffffff;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px;
          }
          .totals-table { width: 340px; margin-left: auto; border-collapse: collapse; }
          .totals-table td { padding: 6px 10px; }
          .total-row { font-size: 16px; font-weight: 800; color: #1e3a8a; border-top: 2px solid #1e3a8a; }
          .bank-box {
            border: 1px solid #bfdbfe;
            background: #eff6ff;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 12px;
            color: #1e40af;
          }
          .signature-box {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .sign-line {
            width: 220px;
            border-top: 1px dashed #9ca3af;
            text-align: center;
            padding-top: 6px;
            font-size: 11px;
            color: #4b5563;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="vertical-align: top; width: 60%;">
              <div class="company-name">${settings.businessName || "CROISSANCE OIL & GAS LTD"}</div>
              ${settings.rcNumber ? `<div style="font-weight: 600; color: #4b5563; margin-top: 2px;">RC: ${settings.rcNumber}</div>` : ""}
              ${settings.stationAddress ? `<div style="color: #4b5563; margin-top: 4px; font-size: 12px;"><strong>Station:</strong> ${settings.stationAddress}</div>` : ""}
              ${settings.officeAddress ? `<div style="color: #4b5563; font-size: 12px;"><strong>Office:</strong> ${settings.officeAddress}</div>` : ""}
              ${settings.phoneNumbers ? `<div style="color: #4b5563; font-size: 12px;"><strong>Tel:</strong> ${settings.phoneNumbers}</div>` : ""}
            </td>
            <td style="vertical-align: top; text-align: right; width: 40%;">
              <div class="doc-title">INVOICE</div>
              <div style="font-size: 14px; font-weight: 700; color: #374151; margin-top: 4px;"># ${sale.invoiceNumber}</div>
              <div style="margin-top: 6px;">
                <span class="badge ${sale.paymentStatus === 'Completed' || sale.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}">
                  ${sale.paymentStatus === 'Completed' || sale.paymentStatus === 'Paid' ? 'PAID' : (sale.paymentStatus || 'COMPLETED')}
                </span>
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                <strong>Date:</strong> ${formatDate(sale.date)}
              </div>
            </td>
          </tr>
        </table>

        <!-- Bill To / Details Grid -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 12px;">
              <div class="info-card">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 6px;">Billed To:</div>
                <div style="font-size: 15px; font-weight: 700; color: #111827;">${sale.customerName || "Walk-in Customer"}</div>
                ${sale.customerPhone ? `<div style="color: #4b5563; font-size: 12px; margin-top: 2px;">Phone: ${sale.customerPhone}</div>` : ""}
                ${sale.customerAddress ? `<div style="color: #4b5563; font-size: 12px; margin-top: 2px;">Address: ${sale.customerAddress}</div>` : ""}
              </div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 12px;">
              <div class="info-card">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 6px;">Transaction Details:</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #6b7280;">Payment Method:</span>
                  <span style="font-weight: 600; text-transform: uppercase;">${sale.paymentMethod || "Cash"}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #6b7280;">Sales Attendant:</span>
                  <span style="font-weight: 600;">${sale.staffName || "Staff"}</span>
                </div>
                ${sale.waybillNumber ? `
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280;">Linked Waybill:</span>
                  <span style="font-weight: 600; color: #1e3a8a;">${sale.waybillNumber}</span>
                </div>
                ` : ""}
              </div>
            </td>
          </tr>
        </table>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">S/N</th>
              <th style="width: 45%; text-align: left;">Item Description</th>
              <th style="width: 10%; text-align: center;">Unit</th>
              <th style="width: 12%; text-align: center;">Quantity</th>
              <th style="width: 14%; text-align: right;">Unit Price</th>
              <th style="width: 14%; text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Totals & Notes -->
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; width: 55%; padding-right: 20px;">
              <div class="bank-box">
                <div style="font-weight: 700; margin-bottom: 4px; font-size: 13px;">Official Bank Settlement Details:</div>
                <div><strong>Bank Name:</strong> ${settings.bankName || "First Bank of Nigeria"}</div>
                <div><strong>Account Number:</strong> <span style="font-family: monospace; font-weight: 700; font-size: 13px; letter-spacing: 0.5px;">${settings.accountNumber || "2034891234"}</span></div>
                <div><strong>Account Name:</strong> ${settings.accountName || settings.businessName || "Croissance Oil and Gas Ltd"}</div>
                ${settings.bankBranch ? `<div><strong>Branch:</strong> ${settings.bankBranch}</div>` : ""}
                ${settings.secondaryBankName && settings.secondaryAccountNumber ? `
                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #bfdbfe; font-size: 11px;">
                  <strong>Alternative Bank:</strong> ${settings.secondaryBankName} &bull; ${settings.secondaryAccountNumber} (${settings.secondaryAccountName || settings.businessName || ""})
                </div>
                ` : ""}
                <div style="margin-top: 4px;"><strong>Payment Ref / Narration:</strong> ${sale.invoiceNumber}</div>
                <div style="margin-top: 6px; font-size: 11px; color: #3b82f6;">
                  ${settings.paymentInstructions || "Thank you for your business! Goods sold in good condition are not returnable."}
                </div>
              </div>
            </td>
            <td style="vertical-align: top; width: 45%;">
              <table class="totals-table">
                <tr>
                  <td style="color: #4b5563;">Subtotal:</td>
                  <td style="text-align: right; font-weight: 600;">${formatCurrency(sale.subtotal || sale.totalAmount)}</td>
                </tr>
                ${sale.discount > 0 ? `
                <tr>
                  <td style="color: #dc2626;">Discount:</td>
                  <td style="text-align: right; font-weight: 600; color: #dc2626;">-${formatCurrency(sale.discount)}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="color: #4b5563;">VAT / Tax:</td>
                  <td style="text-align: right; color: #6b7280;">₦0.00 (Exempt)</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL DUE:</td>
                  <td style="text-align: right;">${formatCurrency(sale.totalAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Signatures Section -->
        <div style="margin-top: 50px; display: table; width: 100%;">
          <div style="display: table-cell; width: 50%; vertical-align: top;">
            <div style="width: 220px; border-top: 1px dashed #9ca3af; text-align: center; padding-top: 6px; font-size: 11px; color: #4b5563;">
              Authorized Signatory & Stamp<br>
              <strong>${settings.businessName || "Croissance Oil & Gas Ltd"}</strong>
            </div>
          </div>
          <div style="display: table-cell; width: 50%; vertical-align: top; text-align: right;">
            <div style="display: inline-block; width: 220px; border-top: 1px dashed #9ca3af; text-align: center; padding-top: 6px; font-size: 11px; color: #4b5563;">
              Customer Acknowledgement<br>
              <strong>Name, Signature & Date</strong>
            </div>
          </div>
        </div>

      </body>
    </html>
  `;
}

/**
 * Generates and triggers download of a high-resolution, print-ready A4 PDF Invoice.
 */
export function downloadInvoicePdf(sale: Sale, settings: Settings) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Primary brand navy color banner top
  doc.setFillColor(30, 58, 138); // #1e3a8a
  doc.rect(0, 0, pageWidth, 6, "F");

  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138);
  doc.text((settings.businessName || "CROISSANCE OIL & GAS LTD").toUpperCase(), 14, 18);

  // Invoice Title on Right
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138);
  doc.text("INVOICE", pageWidth - 14, 18, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(75, 85, 99);
  doc.text(`INVOICE #: ${sale.invoiceNumber}`, pageWidth - 14, 25, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Date: ${formatDate(sale.date)}`, pageWidth - 14, 30, { align: "right" });
  doc.text(`Payment: ${(sale.paymentMethod || "CASH").toUpperCase()} (${(sale.paymentStatus || "PAID").toUpperCase()})`, pageWidth - 14, 35, { align: "right" });

  // Company contact info below business name
  let compY = 24;
  if (settings.rcNumber) {
    doc.text(`RC: ${settings.rcNumber}`, 14, compY);
    compY += 4.5;
  }
  if (settings.stationAddress) {
    const stationLines = doc.splitTextToSize(`Station: ${settings.stationAddress}`, 105);
    doc.text(stationLines, 14, compY);
    compY += (stationLines.length * 4);
  }
  if (settings.officeAddress) {
    const officeLines = doc.splitTextToSize(`Office: ${settings.officeAddress}`, 105);
    doc.text(officeLines, 14, compY);
    compY += (officeLines.length * 4);
  }
  if (settings.phoneNumbers) {
    doc.text(`Tel: ${settings.phoneNumbers}`, 14, compY);
    compY += 4.5;
  }

  const startCardsY = Math.max(compY + 3, 42);

  // Customer / Bill To Box
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(14, startCardsY, (pageWidth - 34) / 2, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("BILLED TO:", 18, startCardsY + 5.5);

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(sale.customerName || "Walk-in Customer", 18, startCardsY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  if (sale.customerPhone) {
    doc.text(`Tel: ${sale.customerPhone}`, 18, startCardsY + 16);
  }
  if (sale.customerAddress) {
    const custAddr = doc.splitTextToSize(`Address: ${sale.customerAddress}`, (pageWidth - 42) / 2);
    doc.text(custAddr[0] || "", 18, startCardsY + 20.5);
  }

  // Cashier & Attendant Box on Right
  const rightBoxX = 14 + (pageWidth - 34) / 2 + 6;
  doc.roundedRect(rightBoxX, startCardsY, (pageWidth - 34) / 2, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("SALES & DISPATCH DETAILS:", rightBoxX + 4, startCardsY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`Sales Attendant: ${sale.staffName || "Staff Attendant"}`, rightBoxX + 4, startCardsY + 11.5);
  doc.text(`Payment Status: ${sale.paymentStatus || "Completed"}`, rightBoxX + 4, startCardsY + 16.5);
  if (sale.waybillNumber) {
    doc.text(`Linked Waybill: ${sale.waybillNumber}`, rightBoxX + 4, startCardsY + 21);
  }

  // Items Table
  const tableBody = sale.items.map((item, idx) => [
    `${idx + 1}`,
    item.productName,
    item.unit || "Unit",
    `${item.quantity}`,
    formatCurrency(item.unitPrice),
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: startCardsY + 28,
    margin: { left: 14, right: 14 },
    head: [["S/N", "ITEM DESCRIPTION", "UNIT", "QTY", "UNIT PRICE", "TOTAL AMOUNT"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left"
    },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [31, 41, 55]
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { cellWidth: 70 },
      2: { halign: "center", cellWidth: 20 },
      3: { halign: "center", cellWidth: 20, fontStyle: "bold" },
      4: { halign: "right", cellWidth: 30 },
      5: { halign: "right", cellWidth: 30, fontStyle: "bold" }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 6;

  // Subtotal, Discount & Total box on the right
  const totalsX = pageWidth - 80;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text("Subtotal:", totalsX, finalY);
  doc.text(formatCurrency(sale.subtotal || sale.totalAmount), pageWidth - 14, finalY, { align: "right" });
  finalY += 5;

  if (sale.discount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text("Discount:", totalsX, finalY);
    doc.text(`-${formatCurrency(sale.discount)}`, pageWidth - 14, finalY, { align: "right" });
    finalY += 5;
  }

  doc.setTextColor(75, 85, 99);
  doc.text("VAT / Tax (0%):", totalsX, finalY);
  doc.text("₦0.00", pageWidth - 14, finalY, { align: "right" });
  finalY += 6;

  // Total Line
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.line(totalsX, finalY - 2, pageWidth - 14, finalY - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("TOTAL AMOUNT:", totalsX, finalY + 3);
  doc.text(formatCurrency(sale.totalAmount), pageWidth - 14, finalY + 3, { align: "right" });

  // Bank Info Box on Left
  const bankBoxY = finalY - 18;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, bankBoxY, totalsX - 22, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text("OFFICIAL SETTLEMENT BANK DETAILS:", 18, bankBoxY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 64, 175);
  doc.text(`Bank Name: ${settings.bankName || "First Bank of Nigeria"}`, 18, bankBoxY + 10.5);
  doc.text(`Account No: ${settings.accountNumber || "2034891234"}`, 18, bankBoxY + 15);
  doc.text(`Account Name: ${settings.accountName || settings.businessName || "Croissance Oil and Gas Ltd"}`, 18, bankBoxY + 19.5);
  doc.text(`Payment Reference: ${sale.invoiceNumber}`, 18, bankBoxY + 24);

  // Signatures Section near bottom
  const sigY = Math.max(finalY + 32, pageHeight - 35);

  doc.setDrawColor(156, 163, 175);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(14, sigY, 74, sigY);
  doc.line(pageWidth - 74, sigY, pageWidth - 14, sigY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text("AUTHORIZED SIGNATURE & STAMP", 44, sigY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(settings.businessName || "Croissance Oil & Gas Ltd", 44, sigY + 8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CUSTOMER ACCEPTANCE / SIGNATURE", pageWidth - 44, sigY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Received in good order and condition", pageWidth - 44, sigY + 8, { align: "center" });

  // Save the PDF
  doc.save(`Invoice_${sale.invoiceNumber}.pdf`);
}

/**
 * Triggers browser and hardware print for the A4 formatted commercial invoice.
 */
export async function printInvoice(sale: Sale, settings: Settings): Promise<boolean> {
  const html = generateInvoiceHtml(sale, settings);
  const result = await executePrint(html, {
    title: `Invoice - ${sale.invoiceNumber}`,
    paperSize: "a4"
  });
  return result.success;
}
