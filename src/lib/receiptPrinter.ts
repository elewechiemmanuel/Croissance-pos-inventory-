import { Sale, Settings } from "../types";
import { formatCurrency, formatDate } from "./utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { executePrint, openStandalonePrintView, printToHardwareSerialPrinter } from "./printerService";

export function generateReceiptHtml(sale: Sale, settings: Settings, paperSize: "thermal80" | "thermal58" | "standard" = "thermal80"): string {
  const width = paperSize === "thermal58" ? "56mm" : paperSize === "thermal80" ? "76mm" : "100%";
  const fontSize = paperSize === "thermal58" ? "10px" : "12px";

  const itemsRows = sale.items.map(item => `
    <tr>
      <td style="padding: 3px 0; vertical-align: top; font-weight: bold;">${item.productName}</td>
      <td style="padding: 3px 0; text-align: center; vertical-align: top;">${item.quantity}</td>
      <td style="padding: 3px 0; text-align: right; vertical-align: top;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 3px 0; text-align: right; vertical-align: top; font-weight: bold;">${formatCurrency(item.total)}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${sale.invoiceNumber}</title>
        <style>
          @page {
            size: ${paperSize === "standard" ? "auto" : paperSize === "thermal58" ? "58mm auto" : "80mm auto"};
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: 'Courier New', Courier, monospace, monospace;
            font-size: ${fontSize};
            line-height: 1.35;
            color: #000;
            background: #fff;
            margin: 0 auto;
            padding: ${paperSize === "standard" ? "20px" : "4mm 3mm"};
            width: ${width};
            max-width: ${paperSize === "standard" ? "140mm" : width};
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            border-bottom: 1px solid #000;
            padding: 2px 0;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: inherit;
          }
          th {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 4px 0;
            font-weight: bold;
          }
          .totals-table td {
            padding: 2px 0;
          }
          .title {
            font-size: 1.3em;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .barcode {
            margin: 10px 0 4px;
            letter-spacing: 3px;
            font-weight: bold;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="title">${settings.businessName || "CROISSANCE OIL & GAS LTD"}</div>
          ${settings.rcNumber ? `<div>RC: ${settings.rcNumber}</div>` : ""}
          ${settings.stationAddress ? `<div style="white-space: pre-line;">${settings.stationAddress}</div>` : ""}
          ${settings.phoneNumbers ? `<div>Tel: ${settings.phoneNumbers}</div>` : ""}
        </div>

        <div class="divider"></div>

        <table style="width: 100%; font-size: 0.95em;">
          <tr>
            <td class="font-bold">RECEIPT #:</td>
            <td class="text-right font-bold">${sale.invoiceNumber}</td>
          </tr>
          <tr>
            <td>DATE:</td>
            <td class="text-right">${formatDate(sale.date)}</td>
          </tr>
          <tr>
            <td>CASHIER:</td>
            <td class="text-right">${sale.staffName || "Attendant"}</td>
          </tr>
          <tr>
            <td>CUSTOMER:</td>
            <td class="text-right">${sale.customerName || "Walk-in"}</td>
          </tr>
        </table>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th class="text-left">ITEM</th>
              <th class="text-center">QTY</th>
              <th class="text-right">PRICE</th>
              <th class="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="divider"></div>

        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">${formatCurrency(sale.subtotal || sale.totalAmount)}</td>
          </tr>
          ${sale.discount > 0 ? `
          <tr>
            <td>Discount:</td>
            <td class="text-right">-${formatCurrency(sale.discount)}</td>
          </tr>
          ` : ""}
          <tr class="double-divider">
            <td class="font-bold" style="font-size: 1.2em;">TOTAL PAID:</td>
            <td class="text-right font-bold" style="font-size: 1.2em;">${formatCurrency(sale.totalAmount)}</td>
          </tr>
          <tr>
            <td>Payment Method:</td>
            <td class="text-right font-bold" style="text-transform: uppercase;">${sale.paymentMethod || "CASH"}</td>
          </tr>
          <tr>
            <td>Payment Status:</td>
            <td class="text-right">${sale.paymentStatus || "Completed"}</td>
          </tr>
        </table>

        <div class="divider"></div>

        <div class="text-center" style="margin-top: 10px; font-size: 0.85em;">
          <p class="font-bold" style="margin: 3px 0;">THANK YOU FOR YOUR PATRONAGE!</p>
          <p style="margin: 3px 0; color: #333;">Goods once sold are not returnable</p>
          <div class="barcode">* ${sale.invoiceNumber} *</div>
          <p style="margin-top: 5px; font-size: 0.8em; color: #666;">Generated via Croissance POS</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Triggers the printer dialog for a receipt using the universal printer service.
 * Supports direct physical printer access, thermal paper sizes, and dedicated standalone tabs.
 */
export async function printReceipt(
  sale: Sale, 
  settings: Settings, 
  paperSize: "thermal80" | "thermal58" | "standard" = "thermal80"
): Promise<boolean> {
  const html = generateReceiptHtml(sale, settings, paperSize);
  const result = await executePrint(html, {
    title: `Receipt - ${sale.invoiceNumber}`,
    paperSize
  });
  return result.success;
}

/**
 * Formats plain text ESC/POS receipt for hardware serial thermal printers
 */
export function generateRawEscPosReceipt(sale: Sale, settings: Settings): string {
  const line = "--------------------------------\n";
  const doubleLine = "================================\n";
  let out = "";
  out += `${(settings.businessName || "CROISSANCE OIL & GAS LTD").toUpperCase()}\n`;
  if (settings.rcNumber) out += `RC: ${settings.rcNumber}\n`;
  if (settings.stationAddress) out += `${settings.stationAddress}\n`;
  if (settings.phoneNumbers) out += `TEL: ${settings.phoneNumbers}\n`;
  out += doubleLine;
  out += `RECEIPT #: ${sale.invoiceNumber}\n`;
  out += `DATE: ${formatDate(sale.date)}\n`;
  out += `ATTENDANT: ${sale.staffName || "Staff"}\n`;
  out += `CUSTOMER: ${sale.customerName || "Walk-in"}\n`;
  out += line;
  out += `ITEM             QTY   PRICE    TOTAL\n`;
  out += line;
  for (const item of sale.items) {
    const name = item.productName.slice(0, 14).padEnd(14);
    const qty = String(item.quantity).padStart(4);
    const total = formatCurrency(item.total).padStart(12);
    out += `${name} ${qty} ${total}\n`;
  }
  out += line;
  out += `SUBTOTAL:   ${formatCurrency(sale.subtotal || sale.totalAmount)}\n`;
  if (sale.discount > 0) {
    out += `DISCOUNT:  -${formatCurrency(sale.discount)}\n`;
  }
  out += `TOTAL PAID: ${formatCurrency(sale.totalAmount)}\n`;
  out += `METHOD:     ${(sale.paymentMethod || "CASH").toUpperCase()}\n`;
  out += `STATUS:     ${sale.paymentStatus || "PAID"}\n`;
  out += doubleLine;
  out += `THANK YOU FOR YOUR PATRONAGE!\n`;
  out += `Goods sold are not returnable.\n`;
  out += `* ${sale.invoiceNumber} *\n\n\n`;
  return out;
}

/**
 * Generates and downloads a PDF receipt for digital distribution or offline backup.
 */
export function downloadReceiptPdf(sale: Sale, settings: Settings) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 180 + (sale.items.length * 8)] // Dynamic receipt height
  });

  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text(settings.businessName || "CROISSANCE OIL & GAS LTD", 40, 10, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  let y = 15;
  if (settings.rcNumber) {
    doc.text(`RC: ${settings.rcNumber}`, 40, y, { align: "center" });
    y += 4;
  }
  if (settings.stationAddress) {
    const addressLines = doc.splitTextToSize(settings.stationAddress, 70);
    doc.text(addressLines, 40, y, { align: "center" });
    y += (addressLines.length * 3.5);
  }
  if (settings.phoneNumbers) {
    doc.text(`Tel: ${settings.phoneNumbers}`, 40, y, { align: "center" });
    y += 4;
  }

  y += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.text(`RECEIPT #: ${sale.invoiceNumber}`, 5, y);
  y += 3.5;
  doc.text(`DATE: ${formatDate(sale.date)}`, 5, y);
  y += 3.5;
  doc.text(`CASHIER: ${sale.staffName || "Attendant"}`, 5, y);
  y += 3.5;
  doc.text(`CUSTOMER: ${sale.customerName || "Walk-in"}`, 5, y);
  y += 4;

  doc.line(5, y, 75, y);
  y += 2;

  const tableBody = sale.items.map(item => [
    item.productName,
    `${item.quantity}`,
    formatCurrency(item.unitPrice),
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 5, right: 5 },
    head: [["ITEM", "QTY", "PRICE", "TOTAL"]],
    body: tableBody,
    theme: "plain",
    styles: { font: "courier", fontSize: 7, cellPadding: 1 },
    headStyles: { font: "courier", fontStyle: "bold", fontSize: 7, textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { halign: "center", cellWidth: 10 },
      2: { halign: "right", cellWidth: 16 },
      3: { halign: "right", cellWidth: 18, fontStyle: "bold" }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 3;
  doc.line(5, y, 75, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.text("Subtotal:", 5, y);
  doc.text(formatCurrency(sale.subtotal || sale.totalAmount), 75, y, { align: "right" });
  y += 3.5;

  if (sale.discount > 0) {
    doc.text("Discount:", 5, y);
    doc.text(`-${formatCurrency(sale.discount)}`, 75, y, { align: "right" });
    y += 3.5;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineDashPattern([], 0);
  doc.line(5, y, 75, y);
  y += 4;

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL PAID:", 5, y);
  doc.text(formatCurrency(sale.totalAmount), 75, y, { align: "right" });
  y += 4;

  doc.line(5, y, 75, y);
  y += 4;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.text(`Payment Method: ${(sale.paymentMethod || "CASH").toUpperCase()}`, 5, y);
  y += 3.5;
  doc.text(`Payment Status: ${sale.paymentStatus || "Completed"}`, 5, y);
  y += 6;

  doc.setFontSize(7);
  doc.text("THANK YOU FOR YOUR PATRONAGE!", 40, y, { align: "center" });
  y += 3.5;
  doc.text("Goods once sold are not returnable.", 40, y, { align: "center" });
  y += 4;
  doc.text(`* ${sale.invoiceNumber} *`, 40, y, { align: "center" });

  doc.save(`Receipt_${sale.invoiceNumber}.pdf`);
}
