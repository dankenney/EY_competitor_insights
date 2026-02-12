import { PrismaClient } from "../../src/generated/prisma";
import { RateLimiter } from "../utils/rate-limiter";
import { ScraperHealthMonitor } from "../health/monitor";

export interface ScrapedItem {
  title: string;
  url: string;
  date?: string;
  excerpt?: string;
  fullText?: string;
  authors?: string[];
  contentType?: string;
}

export abstract class BaseScraper {
  public name: string;
  protected rateLimiter: RateLimiter;
  protected healthMonitor: ScraperHealthMonitor;
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.name = "base-scraper";
    this.rateLimiter = new RateLimiter();
    this.healthMonitor = new ScraperHealthMonitor(prisma);
  }

  abstract scrape(): Promise<ScrapedItem[]>;

  async run(): Promise<void> {
    const runId = await this.healthMonitor.startRun(this.name);

    try {
      const items = await this.scrape();

      await this.healthMonitor.completeRun(runId, {
        itemsFound: items.length,
        itemsNew: items.length,
        itemsUpdated: 0,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.healthMonitor.failRun(runId, err);
      throw err;
    }
  }
}
