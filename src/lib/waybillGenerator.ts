import { WaybillData, Settings } from "../types";
import { formatDate } from "./utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { executePrint } from "./printerService";

export function generateWaybillHtml(waybill: WaybillData, settings: Settings): string {
  const itemsRows = waybill.items.map((item, idx) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${idx + 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${item.productName}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #4b5563;">${item.unit || "Unit"}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700; color: #111827; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">__________</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.remarks || "Intact & Sealed"}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Waybill / Delivery Note - ${waybill.waybillNumber}</title>
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
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .company-name { font-size: 22px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; text-transform: uppercase; }
          .doc-title { font-size: 22px; font-weight: 900; color: #b45309; text-align: right; letter-spacing: 0.5px; }
          .grid-container { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 14px 16px;
            height: 100%;
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
          .notice-box {
            border: 1px solid #fed7aa;
            background: #fffbeb;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 11.5px;
            color: #92400e;
            margin-bottom: 24px;
          }
          .sign-grid { width: 100%; border-collapse: collapse; margin-top: 35px; }
          .sign-col { width: 33.33%; vertical-align: top; padding: 0 10px; text-align: center; }
          .sign-line { border-top: 1px dashed #6b7280; padding-top: 6px; font-size: 11px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="vertical-align: top; width: 60%;">
              <div class="company-name">${settings.businessName || "CROISSANCE OIL & GAS LTD"}</div>
              ${settings.rcNumber ? `<div style="font-weight: 600; color: #4b5563; margin-top: 2px;">RC: ${settings.rcNumber}</div>` : ""}
              ${settings.stationAddress ? `<div style="color: #4b5563; margin-top: 4px; font-size: 12px;"><strong>Station / Depot:</strong> ${settings.stationAddress}</div>` : ""}
              ${settings.officeAddress ? `<div style="color: #4b5563; font-size: 12px;"><strong>Head Office:</strong> ${settings.officeAddress}</div>` : ""}
              ${settings.phoneNumbers ? `<div style="color: #4b5563; font-size: 12px;"><strong>Contact Tel:</strong> ${settings.phoneNumbers}</div>` : ""}
            </td>
            <td style="vertical-align: top; text-align: right; width: 40%;">
              <div class="doc-title">WAYBILL / DELIVERY NOTE</div>
              <div style="font-size: 14px; font-weight: 700; color: #1e3a8a; margin-top: 4px;"># ${waybill.waybillNumber}</div>
              <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">
                <strong>Invoice Ref:</strong> ${waybill.invoiceNumber}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                <strong>Dispatch Date:</strong> ${formatDate(waybill.date)}
              </div>
              ${waybill.deliveryDate ? `
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                <strong>Delivery Date:</strong> ${formatDate(waybill.deliveryDate)}
              </div>
              ` : ""}
            </td>
          </tr>
        </table>

        <!-- Two Column Details Card -->
        <table class="grid-container">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 10px;">
              <div class="info-card">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 6px;">Consignee / Delivery Destination:</div>
                <div style="font-size: 15px; font-weight: 700; color: #111827;">${waybill.customerName}</div>
                ${waybill.businessName ? `<div style="font-weight: 600; color: #374151; font-size: 12px;">${waybill.businessName}</div>` : ""}
                <div style="color: #4b5563; font-size: 12px; margin-top: 3px;">
                  <strong>Destination Address:</strong> ${waybill.deliveryAddress || "As per customer order / Customer pickup"}
                </div>
                ${waybill.customerPhone ? `<div style="color: #4b5563; font-size: 12px; margin-top: 2px;"><strong>Contact Tel:</strong> ${waybill.customerPhone}</div>` : ""}
              </div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 10px;">
              <div class="info-card">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 6px;">Logistics & Transporter Info:</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #6b7280;">Vehicle / Truck Reg No:</span>
                  <span style="font-weight: 700; color: #1e3a8a;">${waybill.vehicleNumber || "NOT SPECIFIED"}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #6b7280;">Driver's Name:</span>
                  <span style="font-weight: 600;">${waybill.driverName || "Designated Driver"}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #6b7280;">Driver's Phone:</span>
                  <span>${waybill.driverPhone || "N/A"}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280;">Dispatch Station:</span>
                  <span style="font-weight: 600;">${waybill.dispatchStation || settings.businessName}</span>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">S/N</th>
              <th style="width: 45%; text-align: left;">Product / Good Description</th>
              <th style="width: 12%; text-align: center;">Unit</th>
              <th style="width: 15%; text-align: center;">Qty Dispatched</th>
              <th style="width: 15%; text-align: center;">Qty Received</th>
              <th style="width: 18%; text-align: left;">Condition / Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Delivery Notice Box -->
        <div class="notice-box">
          <strong>DELIVERY & DISCHARGE INSTRUCTIONS:</strong>
          <p style="margin: 4px 0 0;">
            ${waybill.deliveryNotes || "Ensure vehicle tank/seals and product volume are verified prior to discharge. Driver must inspect all goods before departing the station/depot. Consignee must endorse this waybill upon full receipt."}
          </p>
        </div>

        <!-- 3-Column Signatures -->
        <table class="sign-grid">
          <tr>
            <td class="sign-col">
              <div class="sign-line">
                <strong>DISPATCHED BY</strong><br>
                <span>${waybill.staffName || "Station Attendant / Officer"}</span><br>
                <span style="font-size: 10px; color: #6b7280;">Sign & Date</span>
              </div>
            </td>
            <td class="sign-col">
              <div class="sign-line">
                <strong>CARRIER / DRIVER</strong><br>
                <span>${waybill.driverName || "Driver / Transporter"}</span><br>
                <span style="font-size: 10px; color: #6b7280;">Sign & Date (Goods in Transit)</span>
              </div>
            </td>
            <td class="sign-col">
              <div class="sign-line">
                <strong>RECEIVED BY (CONSIGNEE)</strong><br>
                <span>${waybill.customerName}</span><br>
                <span style="font-size: 10px; color: #6b7280;">Sign, Date & Stamp</span>
              </div>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 30px; font-size: 10.5px; color: #6b7280;">
          Original Copy: Consignee &nbsp;|&nbsp; Duplicate Copy: Driver/Carrier &nbsp;|&nbsp; Triplicate Copy: Station File
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates and downloads a clean, professional A4 Waybill / Delivery Note PDF.
 */
export function downloadWaybillPdf(waybill: WaybillData, settings: Settings) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top amber/gold border line
  doc.setFillColor(217, 119, 6); // Amber 600
  doc.rect(0, 0, pageWidth, 6, "F");

  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138); // Navy
  doc.text((settings.businessName || "CROISSANCE OIL & GAS LTD").toUpperCase(), 14, 18);

  // Document Title on Right
  doc.setFontSize(16);
  doc.setTextColor(217, 119, 6); // Amber
  doc.text("WAYBILL / DELIVERY NOTE", pageWidth - 14, 18, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(75, 85, 99);
  doc.text(`WAYBILL #: ${waybill.waybillNumber}`, pageWidth - 14, 25, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Invoice Ref: ${waybill.invoiceNumber}`, pageWidth - 14, 30, { align: "right" });
  doc.text(`Dispatch Date: ${formatDate(waybill.date)}`, pageWidth - 14, 35, { align: "right" });

  // Company address block
  let compY = 24;
  if (settings.rcNumber) {
    doc.text(`RC: ${settings.rcNumber}`, 14, compY);
    compY += 4.5;
  }
  if (settings.stationAddress) {
    const stationLines = doc.splitTextToSize(`Station / Depot: ${settings.stationAddress}`, 105);
    doc.text(stationLines, 14, compY);
    compY += (stationLines.length * 4);
  }
  if (settings.officeAddress) {
    const officeLines = doc.splitTextToSize(`Head Office: ${settings.officeAddress}`, 105);
    doc.text(officeLines, 14, compY);
    compY += (officeLines.length * 4);
  }
  if (settings.phoneNumbers) {
    doc.text(`Tel: ${settings.phoneNumbers}`, 14, compY);
    compY += 4.5;
  }

  const startCardsY = Math.max(compY + 3, 44);

  // Consignee Box (Left)
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(14, startCardsY, (pageWidth - 34) / 2, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("CONSIGNEE / DELIVERY DESTINATION:", 18, startCardsY + 5.5);

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(waybill.customerName, 18, startCardsY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  if (waybill.customerPhone) {
    doc.text(`Phone: ${waybill.customerPhone}`, 18, startCardsY + 16);
  }
  const destLines = doc.splitTextToSize(`Destination: ${waybill.deliveryAddress || "Customer Pickup / Local Station"}`, (pageWidth - 42) / 2);
  doc.text(destLines[0] || "", 18, startCardsY + 21);
  if (destLines[1]) {
    doc.text(destLines[1], 18, startCardsY + 25);
  }

  // Logistics & Transporter Box (Right)
  const rightBoxX = 14 + (pageWidth - 34) / 2 + 6;
  doc.roundedRect(rightBoxX, startCardsY, (pageWidth - 34) / 2, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("TRANSPORT & LOGISTICS DETAILS:", rightBoxX + 4, startCardsY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text(`Truck / Vehicle Reg: ${waybill.vehicleNumber || "NOT SPECIFIED"}`, rightBoxX + 4, startCardsY + 11);
  doc.text(`Driver Name: ${waybill.driverName || "Designated Driver"}`, rightBoxX + 4, startCardsY + 16);
  doc.text(`Driver Phone: ${waybill.driverPhone || "N/A"}`, rightBoxX + 4, startCardsY + 21);
  doc.text(`Dispatch Station: ${waybill.dispatchStation || settings.businessName}`, rightBoxX + 4, startCardsY + 25.5);

  // Items Table
  const tableBody = waybill.items.map((item, idx) => [
    `${idx + 1}`,
    item.productName,
    item.unit || "Unit",
    `${item.quantity}`,
    "", // Qty received to be written or verified
    item.remarks || "Good condition, sealed"
  ]);

  autoTable(doc, {
    startY: startCardsY + 32,
    margin: { left: 14, right: 14 },
    head: [["S/N", "GOODS / PRODUCT DESCRIPTION", "UNIT", "QTY DISPATCHED", "QTY RECEIVED", "CONDITION / REMARKS"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
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
      1: { cellWidth: 65 },
      2: { halign: "center", cellWidth: 20 },
      3: { halign: "center", cellWidth: 28, fontStyle: "bold" },
      4: { halign: "center", cellWidth: 25 },
      5: { cellWidth: 32 }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 6;

  // Delivery Notes Box
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(14, finalY, pageWidth - 28, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.text("DELIVERY & DISCHARGE INSTRUCTIONS:", 18, finalY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const noteLines = doc.splitTextToSize(
    waybill.deliveryNotes ||
      "All goods must be inspected for seal integrity and correct quantity before discharge. The carrier and recipient must sign this document upon delivery.",
    pageWidth - 36
  );
  doc.text(noteLines, 18, finalY + 8.5);

  // Signatures Section: 3 distinct columns
  const sigY = Math.max(finalY + 36, pageHeight - 38);
  const colWidth = (pageWidth - 28) / 3;

  doc.setDrawColor(156, 163, 175);
  doc.setLineDashPattern([1, 1], 0);

  // 1. Dispatched By
  doc.line(14, sigY, 14 + colWidth - 8, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text("DISPATCHED BY", 14 + (colWidth - 8) / 2, sigY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(waybill.staffName || "Station Officer", 14 + (colWidth - 8) / 2, sigY + 8, { align: "center" });
  doc.text("Sign, Date & Stamp", 14 + (colWidth - 8) / 2, sigY + 11.5, { align: "center" });

  // 2. Carrier / Driver
  const col2X = 14 + colWidth;
  doc.line(col2X, sigY, col2X + colWidth - 8, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CARRIER / DRIVER", col2X + (colWidth - 8) / 2, sigY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(waybill.driverName || "Driver / Transporter", col2X + (colWidth - 8) / 2, sigY + 8, { align: "center" });
  doc.text("Sign & Date (In Transit)", col2X + (colWidth - 8) / 2, sigY + 11.5, { align: "center" });

  // 3. Received By (Consignee)
  const col3X = 14 + colWidth * 2;
  doc.line(col3X, sigY, col3X + colWidth - 8, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("RECEIVED BY (CONSIGNEE)", col3X + (colWidth - 8) / 2, sigY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(waybill.customerName, col3X + (colWidth - 8) / 2, sigY + 8, { align: "center" });
  doc.text("Sign, Date & Stamp", col3X + (colWidth - 8) / 2, sigY + 11.5, { align: "center" });

  // Footer notes
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text("ORIGINAL: Consignee  |  DUPLICATE: Transporter/Driver  |  TRIPLICATE: Station Record", pageWidth / 2, pageHeight - 8, { align: "center" });

  // Save the PDF
  doc.save(`Waybill_${waybill.waybillNumber}.pdf`);
}

/**
 * Triggers browser and hardware print for the A4 formatted Waybill document.
 */
export async function printWaybill(waybill: WaybillData, settings: Settings): Promise<boolean> {
  const html = generateWaybillHtml(waybill, settings);
  const result = await executePrint(html, {
    title: `Waybill - ${waybill.waybillNumber}`,
    paperSize: "a4"
  });
  return result.success;
}
