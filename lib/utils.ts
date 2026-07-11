import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatOrderNumber(order: { id: string; orderNumber?: string; createdAt?: string }) {
  if (order.orderNumber) return order.orderNumber;
  const date = order.createdAt ? new Date(order.createdAt) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `MORE-${year}${month}${day}-${order.id.slice(0, 5).toUpperCase()}`;
}

export function toIsoNow() {
  return new Date().toISOString();
}

export function isConfigured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0 && !value.includes("your_"));
}

export function safePrivateKey(value: string | undefined) {
  return value?.replace(/\\n/g, "\n");
}
