import { Settings, WaybillData } from "../types";

export function generateWaybillHtml(data: WaybillData, settings: Settings): string {
  const itemsRows = (data.items || []).map((item, index) => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.productName || item.name || "Item"}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity || 0}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.unit || "Units"}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.remarks || "Good"}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family: Arial, sans-serif; padding: 30px; color: #333; max-width: 800px; margin: 0 auto; background: #fff;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0; color: #1e3a8a; font-size: 24px;">${settings?.businessName || "Company Name"}</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #555;">${settings?.stationAddress || settings?.address || ""}</p>
          <p style="margin: 2px 0 0; font-size: 12px; color: #555;">Phone: ${settings?.phone || ""}</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; color: #d97706; font-size: 20px;">OFFICIAL WAYBILL</h2>
          <p style="margin: 4px 0 0; font-size: 13px; font-weight: bold;">Waybill #: ${data?.waybillNumber || "N/A"}</p>
          <p style="margin: 2px 0 0; font-size: 12px; color: #555;">Invoice Ref: ${data?.invoiceNumber || "N/A"}</p>
          <p style="margin: 2px 0 0; font-size: 12px; color: #555;">Date: ${data?.date ? new Date(data.date).toLocaleDateString() : new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 13px;">
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <strong style="color: #1e3a8a; display: block; margin-bottom: 4px;">CONSIGNEE / CUSTOMER:</strong>
          <div><strong>Name:</strong> ${data?.customerName || "N/A"}</div>
          <div><strong>Phone:</strong> ${data?.customerPhone || "N/A"}</div>
          <div><strong>Delivery Address:</strong> ${data?.deliveryAddress || data?.destination || "N/A"}</div>
        </div>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <strong style="color: #1e3a8a; display: block; margin-bottom: 4px;">TRANSPORTER / LOGISTICS:</strong>
          <div><strong>Vehicle Number:</strong> ${data?.vehicleNumber || "N/A"}</div>
          <div><strong>Driver's Name:</strong> ${data?.driverName || "N/A"}</div>
          <div><strong>Driver's Phone:</strong> ${data?.driverPhone || "N/A"}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #1e3a8a; color: white;">
            <th style="padding: 8px; text-align: center; width: 40px;">S/N</th>
            <th style="padding: 8px; text-align: left;">Product Description</th>
            <th style="padding: 8px; text-align: center; width: 80px;">Qty</th>
            <th style="padding: 8px; text-align: center; width: 80px;">Unit</th>
            <th style="padding: 8px; text-align: left;">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div style="margin-bottom: 30px; font-size: 12px; background: #fffbeb; border: 1px solid #fde68a; padding: 10px; border-radius: 6px;">
        <strong>Delivery &amp; Discharge Notes:</strong>
        <p style="margin: 4px 0 0; color: #451a03;">${data?.deliveryNotes || "Ensure verification of seals and volume prior to discharge."}</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; text-align: center;">
        <div style="border-top: 1px solid #333; width: 200px; padding-top: 5px;">
          Dispatcher / Issuer Signature
        </div>
        <div style="border-top: 1px solid #333; width: 200px; padding-top: 5px;">
          Driver / Receiver Signature
        </div>
      </div>
    </div>
  `;
}

export function downloadWaybillPdf(data: WaybillData, settings: Settings) {
  const htmlContent = generateWaybillHtml(data, settings);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head><title>Waybill - ${data?.waybillNumber || "Document"}</title></head>
        <body onload="window.print(); window.close();">
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

export async function printWaybill(data: WaybillData, settings: Settings) {
  downloadWaybillPdf(data, settings);
}

export function generateWaybillNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `WB-${timestamp}-${randomNum}`;
}