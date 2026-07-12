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

function normalizeDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  if (value && typeof value === "object") {
    const candidate = value as {
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof candidate.toDate === "function") return candidate.toDate();
    if (typeof candidate.seconds === "number") return new Date(candidate.seconds * 1000);
    if (typeof candidate._seconds === "number") return new Date(candidate._seconds * 1000);
  }
  return new Date();
}

export function formatDate(value: unknown) {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: EGYPT_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(normalizeDate(value));
}

export function formatDateOnly(value: unknown) {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: EGYPT_TIME_ZONE,
    dateStyle: "medium",
  }).format(normalizeDate(value));
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
