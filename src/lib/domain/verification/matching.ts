/**
 * Matching engine with token similarity, initials resolution, and validity checks.
 * Zero external dependencies.
 */

import { normalizeName, normalizeRegistrationNumber, normalizeAuthority, tokenizeSorted } from "./normalization";

export interface NameMatchDetails {
  score: number;
  exactMatch: boolean;
  tokenSortMatch: boolean;
  initialsMatch: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

/**
 * Computes Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Computes string similarity between 0.0 and 1.0 based on Levenshtein distance
 */
export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  if (a === b) return 1.0;

  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Evaluates token similarity between two names, taking into account:
 * - Token permutations (e.g. "Priya Sharma" vs "Sharma Priya")
 * - Single-letter initials (e.g. "P. Sharma" vs "Priya Sharma")
 * - Minor typographical differences
 */
export function matchNames(nameA: string, nameB: string): NameMatchDetails {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);

  if (!normA || !normB) {
    return {
      score: 0.0,
      exactMatch: false,
      tokenSortMatch: false,
      initialsMatch: false,
      confidence: "NONE",
    };
  }

  // 1. Exact string match
  if (normA === normB) {
    return {
      score: 1.0,
      exactMatch: true,
      tokenSortMatch: true,
      initialsMatch: true,
      confidence: "HIGH",
    };
  }

  const tokensA = normA.split(/\s+/).filter(Boolean);
  const tokensB = normB.split(/\s+/).filter(Boolean);

  // 2. Token sort match (handles inverted token order)
  const sortedA = tokenizeSorted(normA).join(" ");
  const sortedB = tokenizeSorted(normB).join(" ");
  if (sortedA === sortedB) {
    return {
      score: 0.98,
      exactMatch: false,
      tokenSortMatch: true,
      initialsMatch: true,
      confidence: "HIGH",
    };
  }

  // 3. Token-by-token matching with initial resolution
  // Check if every token in the shorter list matches a token in the longer list (or matches its initial)
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];

  let matchedTokens = 0;
  let hasInitialMatch = false;
  const usedLongerIndices = new Set<number>();

  for (const sTok of shorter) {
    let bestMatchIdx = -1;
    let bestMatchScore = 0;

    for (let i = 0; i < longer.length; i++) {
      if (usedLongerIndices.has(i)) continue;
      const lTok = longer[i];

      // Exact token match
      if (sTok === lTok) {
        bestMatchScore = 1.0;
        bestMatchIdx = i;
        break;
      }

      // Initial check (1 letter token matching the first letter of a longer token)
      if (sTok.length === 1 && lTok.startsWith(sTok)) {
        if (0.85 > bestMatchScore) {
          bestMatchScore = 0.85;
          bestMatchIdx = i;
          hasInitialMatch = true;
        }
      } else if (lTok.length === 1 && sTok.startsWith(lTok)) {
        if (0.85 > bestMatchScore) {
          bestMatchScore = 0.85;
          bestMatchIdx = i;
          hasInitialMatch = true;
        }
      } else {
        // String similarity between individual tokens
        const sim = stringSimilarity(sTok, lTok);
        if (sim >= 0.8 && sim > bestMatchScore) {
          bestMatchScore = sim;
          bestMatchIdx = i;
        }
      }
    }

    if (bestMatchIdx !== -1 && bestMatchScore >= 0.8) {
      usedLongerIndices.add(bestMatchIdx);
      matchedTokens += bestMatchScore;
    }
  }

  const tokenCoverage = matchedTokens / Math.max(shorter.length, 1);
  const totalLengthPenalty = Math.min(1.0, shorter.length / longer.length);
  const overallScore = Number((tokenCoverage * (0.8 + 0.2 * totalLengthPenalty)).toFixed(3));

  let confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE" = "NONE";
  if (overallScore >= 0.85) confidence = "HIGH";
  else if (overallScore >= 0.65) confidence = "MEDIUM";
  else if (overallScore >= 0.4) confidence = "LOW";

  return {
    score: overallScore,
    exactMatch: false,
    tokenSortMatch: false,
    initialsMatch: hasInitialMatch,
    confidence,
  };
}

/**
 * Matches registration numbers:
 * Must be exact match after normalization (strip symbols, case-insensitive)
 */
export function matchRegistrationNumber(a: string, b: string): { match: boolean; score: number } {
  const normA = normalizeRegistrationNumber(a);
  const normB = normalizeRegistrationNumber(b);

  if (!normA || !normB) return { match: false, score: 0 };
  const match = normA === normB;
  return { match, score: match ? 1.0 : 0.0 };
}

/**
 * Matches issuing authorities and states
 */
export function matchAuthorityAndState(
  authorityA: string,
  authorityB: string,
  stateA?: string | null,
  stateB?: string | null
): { match: boolean; score: number } {
  const normAuthA = normalizeAuthority(authorityA);
  const normAuthB = normalizeAuthority(authorityB);

  if (!normAuthA || !normAuthB) return { match: false, score: 0 };

  // Direct match or substring containment
  const authMatches =
    normAuthA === normAuthB ||
    normAuthA.includes(normAuthB) ||
    normAuthB.includes(normAuthA);

  let stateMatches = true;
  if (stateA && stateB) {
    const sA = stateA.toLowerCase().trim();
    const sB = stateB.toLowerCase().trim();
    stateMatches = sA === sB || sA.includes(sB) || sB.includes(sA);
  }

  if (authMatches && stateMatches) {
    return { match: true, score: 1.0 };
  }

  if (authMatches) {
    return { match: true, score: 0.8 };
  }

  return { match: false, score: 0.0 };
}

/**
 * Checks validity dates against current timestamp
 */
export function checkValidityDates(
  validFrom?: Date | string | null,
  validUntil?: Date | string | null,
  referenceDate = new Date()
): { isValid: boolean; isExpired: boolean; daysRemaining?: number } {
  const now = referenceDate.getTime();

  if (validFrom) {
    const fromTime = new Date(validFrom).getTime();
    if (!isNaN(fromTime) && fromTime > now) {
      return { isValid: false, isExpired: false };
    }
  }

  if (validUntil) {
    const untilTime = new Date(validUntil).getTime();
    if (!isNaN(untilTime)) {
      const diffMs = untilTime - now;
      const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const isExpired = diffMs < 0;
      return {
        isValid: !isExpired,
        isExpired,
        daysRemaining,
      };
    }
  }

  // If no expiry date exists, record is assumed currently valid
  return { isValid: true, isExpired: false };
}
