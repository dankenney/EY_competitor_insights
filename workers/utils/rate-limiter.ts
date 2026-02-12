export class RateLimiter {
  private lastRequestTime: Map<string, number> = new Map();
  private minDelayMs: number;

  constructor(minDelayMs: number = 2000) {
    this.minDelayMs = minDelayMs;
  }

  async waitForDomain(domain: string): Promise<void> {
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(domain);

    if (lastTime !== undefined) {
      const elapsed = now - lastTime;
      if (elapsed < this.minDelayMs) {
        const waitTime = this.minDelayMs - elapsed;
        console.log(
          `[rate-limiter] Waiting ${waitTime}ms before next request to ${domain}`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.lastRequestTime.set(domain, Date.now());
  }
}
