import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind CSS class merger utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatting utility (Naira format)
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === undefined || amount === null) return "₦0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount).replace("NGN", "₦");
}

// Date formatting utility
export function formatDate(timestamp: any): string {
  if (!timestamp) return "N/A";

  let date: Date;

  if (typeof timestamp === "object") {
    if (typeof timestamp.seconds === "number") {
      date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp._seconds === "number") {
      date = new Date(timestamp._seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp.toString());
    }
  } else if (typeof timestamp === "number") {
    date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return "N/A";

  // Force it to use your local time zone cleanly
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}