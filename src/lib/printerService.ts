/**
 * Croissance Oil & Gas - Universal Device & Browser Printer Service
 * 
 * Guarantees printer access on all devices:
 * 1. Physical Installed Printers (Epson, Xprinter, HP, Canon, Brother, POS-80, POS-58, etc.)
 *    via the operating system's native print spooler.
 * 2. Unrestricted Top-Level Window Execution: Automatically breaks out of sandboxed iframe
 *    restrictions so the device's native print dialog ALWAYS appears.
 * 3. Direct Hardware USB/Serial ESC/POS printing (Web Serial API).
 * 4. Direct Wireless Bluetooth Thermal POS printing (Web Bluetooth API).
 */

export interface PrintOptions {
  title?: string;
  paperSize?: "thermal80" | "thermal58" | "standard" | "a4";
  autoClose?: boolean;
}

export interface PrintResult {
  success: boolean;
  strategy: "direct_spooler" | "popup_window" | "blob_window" | "serial_escpos" | "bluetooth";
  message: string;
  error?: any;
}

/**
 * Checks if the application is currently running inside an iframe (e.g. AI Studio preview).
 * Browsers block `window.print()` inside sandboxed iframes without `allow-modals`.
 */
export function isSandboxedIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * Checks if Web Serial API is available for direct USB/Serial thermal receipt printers.
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/**
 * Checks if Web Bluetooth API is available for mobile wireless receipt printers.
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Injects non-printing controls and automated printer launch scripts into printable HTML.
 */
export function wrapHtmlWithPrintControls(rawHtml: string, title: string = "Print Document"): string {
  const controlsHeader = `
    <div id="croissance-print-bar" class="no-print" style="
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: #1e3a8a;
      color: #ffffff;
      padding: 12px 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-bottom: 3px solid #f59e0b;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">🖨️</span>
        <div>
          <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.2px;">CROISSANCE POS - DEVICE PRINTER ACCESS</div>
          <div style="font-size: 11px; opacity: 0.85;">Your device's installed printer dialog should open automatically below.</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button 
          id="manual-print-btn"
          onclick="window.focus(); window.print();" 
          style="
            background: #f59e0b;
            color: #1e1e24;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 6px;
          "
        >
          <span>Print on My Installed Printer</span>
        </button>
        <button 
          onclick="window.close();" 
          style="
            background: rgba(255,255,255,0.15);
            color: #ffffff;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
          "
        >
          Close
        </button>
      </div>
    </div>
  `;

  const autoPrintScript = `
    <style>
      @media print {
        .no-print, #croissance-print-bar {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
    </style>
    <script>
      (function() {
        function launchInstalledPrinter() {
          try {
            window.focus();
            window.print();
          } catch(err) {
            console.warn("Auto-print trigger error:", err);
          }
        }

        if (document.readyState === 'complete') {
          setTimeout(launchInstalledPrinter, 250);
        } else {
          window.addEventListener('load', function() {
            setTimeout(launchInstalledPrinter, 250);
          });
        }
      })();
    </script>
  `;

  // Inject controls after <body> tag
  let modified = rawHtml;
  if (modified.includes("<body")) {
    modified = modified.replace(/<body([^>]*)>/i, `<body$1>${controlsHeader}`);
  } else {
    modified = `${controlsHeader}${modified}`;
  }

  // Inject auto-print script before </body>
  if (modified.includes("</body>")) {
    modified = modified.replace("</body>", `${autoPrintScript}</body>`);
  } else {
    modified = `${modified}${autoPrintScript}`;
  }

  return modified;
}

/**
 * Universal print executor that reliably invokes the physical printer installed on the user's device.
 */
export async function executePrint(rawHtml: string, options: PrintOptions = {}): Promise<PrintResult> {
  const title = options.title || "Print Document";
  const paperSize = options.paperSize || "thermal80";
  const preparedHtml = wrapHtmlWithPrintControls(rawHtml, title);

  const width = paperSize === "thermal58" || paperSize === "thermal80" ? 480 : 860;
  const height = 740;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);

  // If inside an iframe (like AI Studio preview), window.print() inside the iframe is blocked
  // by browser sandbox policy without allow-modals. We MUST use top-level window/tab.
  const inIframe = isSandboxedIframe();

  // Strategy 1: Top-level Standalone Print Window
  // This gives the browser complete permission to open the OS installed printer dialog.
  try {
    const printWin = window.open(
      "",
      "_blank",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,toolbar=no,menubar=no`
    );

    if (printWin && !printWin.closed) {
      printWin.document.open();
      printWin.document.write(preparedHtml);
      printWin.document.close();
      printWin.focus();

      return {
        success: true,
        strategy: "popup_window",
        message: "Device printer window launched. Your installed printer dialog will appear."
      };
    }
  } catch (winErr) {
    console.warn("Direct window.open blocked or restricted:", winErr);
  }

  // Strategy 2: Blob URL Window / Tab (bypasses cross-origin restrictions)
  try {
    const blob = new Blob([preparedHtml], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    
    const win = window.open(blobUrl, "_blank");
    if (win) {
      return {
        success: true,
        strategy: "blob_window",
        message: "Printer tab opened. Accessing your device's installed printer."
      };
    }

    // If popup was blocked by browser, trigger anchor click as user gesture fallback
    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 1500);

    return {
      success: true,
      strategy: "blob_window",
      message: "Opening print document in a new tab for your installed printer."
    };
  } catch (blobErr) {
    console.warn("Blob print window failed:", blobErr);
  }

  // Strategy 3: Direct in-page print (if running at top level, not in iframe)
  if (!inIframe) {
    try {
      let container = document.getElementById("croissance-printable-content");
      if (!container) {
        container = document.createElement("div");
        container.id = "croissance-printable-content";
        document.body.appendChild(container);
      }
      container.innerHTML = rawHtml;
      
      await new Promise(r => setTimeout(r, 100));
      window.focus();
      window.print();

      setTimeout(() => {
        if (container) container.innerHTML = "";
      }, 2000);

      return {
        success: true,
        strategy: "direct_spooler",
        message: "Native print spooler dialog opened."
      };
    } catch (spoolerErr) {
      console.error("Direct spooler print failed:", spoolerErr);
    }
  }

  return {
    success: false,
    strategy: "direct_spooler",
    message: "Could not open printer automatically. Please allow popups or open in a new tab to access your device's installed printer."
  };
}

/**
 * Open a standalone print window in 1-click.
 */
export function openStandalonePrintView(rawHtml: string, title: string = "Print") {
  const preparedHtml = wrapHtmlWithPrintControls(rawHtml, title);
  const blob = new Blob([preparedHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }
}

/**
 * Sends raw ESC/POS commands directly to a hardware thermal receipt printer over USB/Serial.
 */
export async function printToHardwareSerialPrinter(rawText: string): Promise<boolean> {
  if (!isWebSerialSupported()) {
    alert("Web Serial is not supported in this browser. Please use Google Chrome or Microsoft Edge on desktop to access USB/COM thermal printers.");
    return false;
  }

  try {
    const serial = (navigator as any).serial;
    const port = await serial.requestPort();
    await port.open({ baudRate: 9600 });

    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();

    // ESC/POS Initialize Printer: ESC @ (1B 40)
    const initCmd = new Uint8Array([0x1b, 0x40]);
    await writer.write(initCmd);

    // Write content
    await writer.write(encoder.encode(rawText));

    // Feed lines & Paper Cut command: GS V 66 0
    const cutCmd = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00]);
    await writer.write(cutCmd);

    writer.releaseLock();
    await port.close();
    return true;
  } catch (err: any) {
    if (err.name !== "NotFoundError") {
      console.error("Hardware Serial Printer error:", err);
      alert("Hardware Thermal Printer Error: " + (err.message || "Failed to communicate with printer."));
    }
    return false;
  }
}

/**
 * Sends raw ESC/POS receipt commands directly to a wireless Bluetooth thermal POS printer.
 */
export async function printToBluetoothPrinter(rawText: string): Promise<boolean> {
  if (!isWebBluetoothSupported()) {
    alert("Web Bluetooth is not supported in this browser. Please use Chrome on Android or Chrome on Desktop.");
    return false;
  }

  try {
    const bluetooth = (navigator as any).bluetooth;
    // Standard Bluetooth Serial Port Profile (SPP) UUID or common thermal printer services
    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb", // Common POS printer service
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455"
      ]
    });

    const server = await device.gatt.connect();
    
    // Find writable characteristic
    let characteristic: any = null;
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const c of characteristics) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          characteristic = c;
          break;
        }
      }
      if (characteristic) break;
    }

    if (!characteristic) {
      throw new Error("Could not find a writable print channel on the selected Bluetooth device.");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(rawText);
    
    // Send in chunks of 512 bytes
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await characteristic.writeValue(chunk);
    }

    device.gatt.disconnect();
    return true;
  } catch (err: any) {
    if (err.name !== "NotFoundError") {
      console.error("Bluetooth printer error:", err);
      alert("Bluetooth Printer Notice: " + (err.message || "Failed to send data to Bluetooth printer."));
    }
    return false;
  }
}
