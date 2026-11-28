/**
 * Resilient Circuit Breaker, Exponential Backoff, and Lookup Cache for Registry Providers.
 */

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private threshold = 5,
    private resetTimeoutMs = 60000
  ) {}

  public isAvailable(): boolean {
    const now = Date.now();
    if (this.state === "OPEN") {
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  public recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
    }
  }

  public getState(): "CLOSED" | "OPEN" | "HALF_OPEN" {
    return this.state;
  }
}

/**
 * Execute an async operation with timeout, retries, exponential backoff, and jitter
 */
export async function executeWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    backoffFactor?: number;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, initialDelayMs = 200, backoffFactor = 2, timeoutMs = 4000 } = options;

  let attempt = 1;
  while (attempt <= maxAttempts) {
    try {
      // Timeout promise
      let timer: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Registry provider timeout")), timeoutMs);
      });

      const result = await Promise.race([operation(attempt), timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (err: any) {
      if (attempt === maxAttempts) {
        throw err;
      }
      // Calculate delay with exponential backoff and randomized jitter (+-20%)
      const baseDelay = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      const jitter = (Math.random() * 0.4 - 0.2) * baseDelay;
      const delay = Math.max(50, Math.floor(baseDelay + jitter));

      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }

  throw new Error("Maximum retry attempts reached");
}

/**
 * In-memory short-TTL cache for registry lookups
 */
export class LookupCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();

  constructor(private ttlMs = 5 * 60 * 1000) {}

  public get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  public set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}
