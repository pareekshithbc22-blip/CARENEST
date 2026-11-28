/**
 * Patient sequential code formatting and parsing.
 * Format: PT-0001, PT-0002, etc.
 * Pure function with no external dependencies.
 */

export function formatPatientCode(seq: number): string {
  const safeSeq = Math.max(1, Math.floor(seq || 1));
  return `PT-${String(safeSeq).padStart(4, "0")}`;
}

export function parsePatientCode(code: string | null | undefined): number | null {
  if (!code) return null;
  const match = code.trim().toUpperCase().match(/^PT-(\d+)$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return isNaN(num) ? null : num;
}

/**
 * Normalizes user-entered Patient ID to canonical PT-xxxx format.
 * Trims, uppercases, and accepts variants like:
 * - "pt0001" -> "PT-0001"
 * - "PT 0001" -> "PT-0001"
 * - "pt-1" -> "PT-0001"
 * - "1" -> "PT-0001"
 * - "PT-0042" -> "PT-0042"
 */
export function normalizePatientId(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return "";

  // 1. Matches PT prefix with optional space, hyphen, or nothing followed by digits
  const ptMatch = trimmed.match(/^PT[\s-]?(\d+)$/i);
  if (ptMatch) {
    const num = parseInt(ptMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      return `PT-${String(num).padStart(4, "0")}`;
    }
  }

  // 2. Matches digits only (e.g. "1" or "0001")
  const numOnlyMatch = trimmed.match(/^(\d+)$/);
  if (numOnlyMatch) {
    const num = parseInt(numOnlyMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      return `PT-${String(num).padStart(4, "0")}`;
    }
  }

  return trimmed;
}
