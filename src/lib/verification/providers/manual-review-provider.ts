/**
 * Default Manual Review Provider.
 * Always returns UNAVAILABLE so that when no external registry is connected,
 * every case routes safely to manual compliance review by CARENEST platform administrators.
 */

import type { RegistryProvider, RegistryLookupQuery, RegistryLookupResult } from "./types";

export class ManualReviewProvider implements RegistryProvider {
  public readonly id = "manual-review";
  public readonly name = "CARENEST Manual Compliance Review";
  public readonly authoritative = false;

  public supports(): boolean {
    return true; // Universal fallback
  }

  public async lookup(query: RegistryLookupQuery): Promise<RegistryLookupResult> {
    return {
      outcome: "UNAVAILABLE",
      authoritative: false,
      checkedAt: new Date(),
      providerId: this.id,
      message: "No automated registry provider configured for this authority. Queued for manual compliance review.",
    };
  }
}
