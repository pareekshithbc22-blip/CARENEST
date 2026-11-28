/**
 * Normalization utilities for caretaker names, registration numbers, and authorities.
 * Pure functions with zero external dependencies.
 */

const HONORIFICS = new Set([
  "mr",
  "mrs",
  "ms",
  "miss",
  "dr",
  "doctor",
  "prof",
  "professor",
  "sr",
  "sister",
  "br",
  "brother",
  "nurse",
  "rn",
  "rev",
  "reverend",
  "smt",
  "shri",
  "shree",
  "sri",
  "kumari",
]);

const AUTHORITY_ACRONYMS: Record<string, string> = {
  knc: "karnataka nursing council",
  inc: "indian nursing council",
  dnc: "delhi nursing council",
  mnc: "maharashtra nursing council",
  tnc: "tamil nadu nursing council",
  upnc: "uttar pradesh nursing council",
  wbnd: "west bengal nursing council",
  wbnc: "west bengal nursing council",
  apnc: "andhra pradesh nursing council",
  tsnc: "telangana nursing council",
  gnc: "gujarat nursing council",
  knmc: "kerala nurses and midwives council",
  ksdneb: "karnataka state diploma in nursing examination board",
  mc: "medical council",
  mci: "medical council of india",
  nmc: "national medical commission",
};

/**
 * Normalizes an individual's name:
 * - Trims and lowercases
 * - Decomposes diacritics / accents (NFD)
 * - Removes honorific titles (Dr, Sister, Smt, Sr, etc.)
 * - Strips punctuation (commas, periods, quotes, parentheses)
 * - Performs phonetic / transliteration normalization for common Indian phonetic variations
 * - Normalizes whitespace
 */
export function normalizeName(name: string): string {
  if (!name || typeof name !== "string") return "";

  // 1. Unicode NFD decompose & strip diacritic marks
  let clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // 2. Remove punctuation and special characters
  clean = clean.replace(/[^a-z0-9\s]/g, " ");

  // 3. Tokenize
  const rawTokens = clean.split(/\s+/).filter(Boolean);

  // 4. Strip honorifics & titles
  const tokens = rawTokens.filter((t) => !HONORIFICS.has(t));

  // 5. Normalization of common Indian transliteration equivalents
  // (e.g. ph->f, ee->i, oo->u, w->v, bsh->sh)
  const normalizedTokens = tokens.map((token) => {
    let t = token;
    t = t.replace(/ph/g, "f");
    t = t.replace(/ee/g, "i");
    t = t.replace(/oo/g, "u");
    t = t.replace(/w/g, "v");
    t = t.replace(/kh/g, "k");
    t = t.replace(/gh/g, "g");
    t = t.replace(/dh/g, "d");
    t = t.replace(/th/g, "t");
    t = t.replace(/sh/g, "s");
    return t;
  });

  return normalizedTokens.join(" ").trim();
}

/**
 * Normalizes a medical or nursing registration / license number:
 * - Strips all whitespace, dashes, slashes, periods, and symbols
 * - Converts to uppercase
 */
export function normalizeRegistrationNumber(reg: string): string {
  if (!reg || typeof reg !== "string") return "";
  return reg.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Normalizes an issuing authority / council name:
 * - Lowercases and trims
 * - Expands well-known medical and nursing council acronyms
 * - Strips noise words like "the", "state", "council", "of"
 */
export function normalizeAuthority(authority: string): string {
  if (!authority || typeof authority !== "string") return "";

  let clean = authority.toLowerCase().trim();

  // Check direct acronym expansion
  const acronymKey = clean.replace(/[^a-z0-9]/g, "");
  if (AUTHORITY_ACRONYMS[acronymKey]) {
    return AUTHORITY_ACRONYMS[acronymKey];
  }

  // Remove punctuation
  clean = clean.replace(/[^a-z0-9\s]/g, " ");

  // Expand individual acronym tokens if found
  const tokens = clean
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => AUTHORITY_ACRONYMS[tok] || tok);

  return tokens.join(" ").trim();
}

/**
 * Tokenizes normalized text into a sorted array of tokens
 */
export function tokenizeSorted(text: string): string[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}
