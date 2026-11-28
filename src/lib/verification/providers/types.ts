/**
 * Registry Provider Interfaces and Types
 */

export type RegistryOutcome = "FOUND" | "NOT_FOUND" | "UNAVAILABLE" | "RATE_LIMITED";

export interface RegistryRecord {
  fullName: string;
  registrationNumber: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED" | "EXPIRED";
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  qualification?: string;
  authority: string;
}

export interface RegistryLookupQuery {
  registrationNumber: string;
  authority: string;
  state?: string | null;
  category?: string;
  enteredFullName?: string;
}

export interface RegistryLookupResult {
  outcome: RegistryOutcome;
  record?: RegistryRecord;
  authoritative: boolean;
  checkedAt: Date;
  providerId: string;
  message?: string;
}

export interface RegistryProvider {
  id: string;
  name: string;
  authoritative: boolean;
  supports(authority: string, state?: string | null, category?: string): boolean;
  lookup(query: RegistryLookupQuery): Promise<RegistryLookupResult>;
}
