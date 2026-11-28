/**
 * Medication Stock and Low-Stock Chip Rules
 * Pure function: calculates low-stock alerts and summaries.
 */

export const LOW_STOCK_THRESHOLD = 5;

export function isLowStock(stockCount: number | null | undefined, threshold: number = LOW_STOCK_THRESHOLD): boolean {
  if (stockCount === null || stockCount === undefined || isNaN(stockCount)) return false;
  return stockCount <= threshold;
}

export function formatStockUnit(form?: string | null): string {
  const f = (form || "").toLowerCase();
  if (f === "syrup" || f === "drops" || f === "suspension") {
    return "units";
  }
  if (f.startsWith("capsule")) {
    return "capsules";
  }
  return "tablets";
}

export function formatStockSummary(
  stockCount: number | null | undefined,
  form?: string | null,
  updatedByName?: string | null,
  timeAgoStr?: string | null
): string {
  const count = Math.max(0, Math.floor(stockCount ?? 0));
  const unit = formatStockUnit(form);
  const lowTag = isLowStock(count) ? (count === 0 ? "Out of stock (0 tablets left)" : ` (Low Stock)`) : "";

  if (count === 0) {
    return `Out of stock (0 ${unit} left)`;
  }

  let base = `${count} ${unit} left${lowTag}`;

  if (updatedByName) {
    const when = timeAgoStr || "just now";
    return `${base}, updated by ${updatedByName} ${when}`;
  }

  return base;
}
