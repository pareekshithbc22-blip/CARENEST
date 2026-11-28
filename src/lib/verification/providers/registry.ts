/**
 * Central Registry Provider Manager.
 * Resolves the appropriate provider based on authority, state, and active configuration.
 */

import type { RegistryProvider, RegistryLookupQuery, RegistryLookupResult } from "./types";
import { ManualReviewProvider } from "./manual-review-provider";
import { VerificationDevSandboxProvider } from "./sandbox-provider";
import { CircuitBreaker, executeWithRetry, LookupCache } from "./circuit-breaker";

export class ProviderRegistry {
  private providers: RegistryProvider[] = [];
  private defaultProvider: RegistryProvider = new ManualReviewProvider();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private cache = new LookupCache<RegistryLookupResult>(5 * 60 * 1000); // 5 min TTL

  constructor() {
    this.registerConfiguredProviders();
  }

  private registerConfiguredProviders(): void {
    // 1. Sandbox provider (only in dev/test)
    const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
    const sandboxEnabled = process.env.VERIFICATION_DEV_SANDBOX === "true" || process.env.NODE_ENV === "test";

    if (isDev && sandboxEnabled) {
      try {
        const sandbox = new VerificationDevSandboxProvider();
        this.register(sandbox);
      } catch (err: any) {
        console.warn("[ProviderRegistry] Sandbox provider initialization failed:", err.message);
      }
    }
  }

  public register(provider: RegistryProvider): void {
    this.providers.push(provider);
    this.circuitBreakers.set(provider.id, new CircuitBreaker(5, 60000));
  }

  /**
   * Selects the most specific provider matching authority and state
   */
  public getProvider(authority: string, state?: string | null, category?: string): RegistryProvider {
    for (const provider of this.providers) {
      if (provider.supports(authority, state, category)) {
        return provider;
      }
    }
    return this.defaultProvider;
  }

  /**
   * Executes lookup through selected provider with caching, circuit breaking, and retry
   */
  public async lookup(query: RegistryLookupQuery): Promise<RegistryLookupResult> {
    const cacheKey = `${query.authority.toLowerCase()}:${query.registrationNumber.toUpperCase()}:${query.state || ""}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const provider = this.getProvider(query.authority, query.state, query.category);
    const circuitBreaker = this.circuitBreakers.get(provider.id) || new CircuitBreaker();

    // Check circuit breaker status
    if (!circuitBreaker.isAvailable()) {
      return {
        outcome: "UNAVAILABLE",
        authoritative: false,
        checkedAt: new Date(),
        providerId: provider.id,
        message: `Provider '${provider.name}' circuit breaker is open due to recent upstream failures. Routed to manual review.`,
      };
    }

    try {
      const result = await executeWithRetry(
        async () => {
          return await provider.lookup(query);
        },
        { maxAttempts: 2, timeoutMs: 4000 }
      );

      circuitBreaker.recordSuccess();

      // Cache successful or definitive responses
      if (result.outcome === "FOUND" || result.outcome === "NOT_FOUND") {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (err: any) {
      circuitBreaker.recordFailure();

      return {
        outcome: "UNAVAILABLE",
        authoritative: false,
        checkedAt: new Date(),
        providerId: provider.id,
        message: `Upstream query to provider failed: ${err.message}. Routed to manual review.`,
      };
    }
  }
}

// Singleton provider registry instance
let globalRegistry: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry();
  }
  return globalRegistry;
}
