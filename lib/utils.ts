import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const EGYPT_TIME_ZONE = "Africa/Cairo";

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
    timeZone: EGYPT_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateOnly(value: string | Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: EGYPT_TIME_ZONE,
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatOrderNumber(order: { id: string; orderNumber?: string; createdAt?: string }) {
  if (order.orderNumber) return order.orderNumber;
  const date = order.createdAt ? new Date(order.createdAt) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EGYPT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(safeDate);
  const year = parts.find((part) => part.type === "year")?.value ?? String(safeDate.getUTCFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(safeDate.getUTCMonth() + 1).padStart(2, "0");
  const day = parts.find((part) => part.type === "day")?.value ?? String(safeDate.getUTCDate()).padStart(2, "0");
  return `MORE-${year}${month}${day}-${order.id.slice(0, 5).toUpperCase()}`;
}

export function toIsoNow() {
  return new Date().toISOString();
}

export function isConfigured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0 && !value.includes("your_"));
}

export function safePrivateKey(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted.replace(/\\n/g, "\n");
}
