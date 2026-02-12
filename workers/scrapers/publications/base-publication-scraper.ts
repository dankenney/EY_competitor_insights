import * as cheerio from "cheerio";
import { PrismaClient } from "../../../src/generated/prisma";
import { BaseScraper, ScrapedItem } from "../base";

const USER_AGENT = "CCaSS-Intelligence-Bot/1.0 (EY Competitive Intelligence)";

export abstract class BasePublicationScraper extends BaseScraper {
  public competitorSlug: string;
  public urls: string[];

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.competitorSlug = "";
    this.urls = [];
  }

  abstract extractArticles(
    $: cheerio.CheerioAPI,
    sourceUrl: string
  ): ScrapedItem[];

  async scrape(): Promise<ScrapedItem[]> {
    const allItems: ScrapedItem[] = [];
    const errors: string[] = [];

    for (const url of this.urls) {
      try {
        const domain = new URL(url).hostname;
        await this.rateLimiter.waitForDomain(domain);

        console.log(`[${this.name}] Fetching ${url}`);

        const response = await fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const items = this.extractArticles($, url);

        console.log(`[${this.name}] Extracted ${items.length} articles from ${url}`);
        allItems.push(...items);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`[${this.name}] Error fetching ${url}: ${message}`);
        errors.push(`${url}: ${message}`);
      }
    }

    return allItems;
  }

  async run(): Promise<void> {
    const runId = await this.healthMonitor.startRun(this.name);

    try {
      const competitor = await this.prisma.competitor.findUnique({
        where: { slug: this.competitorSlug },
      });

      if (!competitor) {
        throw new Error(
          `Competitor with slug "${this.competitorSlug}" not found in database`
        );
      }

      const items = await this.scrape();

      let itemsNew = 0;
      let itemsUpdated = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          const normalizedUrl = item.url.split("?")[0].split("#")[0];

          const existing = await this.prisma.publication.findUnique({
            where: { url: normalizedUrl },
          });

          if (existing) {
            itemsUpdated++;
            continue;
          }

          await this.prisma.publication.create({
            data: {
              competitorId: competitor.id,
              title: item.title,
              url: normalizedUrl,
              publishedDate: item.date ? new Date(item.date) : null,
              contentType: item.contentType ?? null,
              authors: item.authors ?? [],
              extractedText: item.fullText ?? item.excerpt ?? null,
              wordCount: item.fullText
                ? item.fullText.split(/\s+/).length
                : item.excerpt
                  ? item.excerpt.split(/\s+/).length
                  : null,
            },
          });

          itemsNew++;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[${this.name}] Error upserting "${item.title}": ${message}`
          );
          errors.push(`Upsert "${item.title}": ${message}`);
        }
      }

      const stats = {
        itemsFound: items.length,
        itemsNew,
        itemsUpdated,
      };

      if (errors.length > 0 && items.length > 0) {
        await this.healthMonitor.partialSuccess(
          runId,
          stats,
          errors.join("; ")
        );
      } else if (items.length === 0 && this.urls.length > 0) {
        await this.healthMonitor.partialSuccess(
          runId,
          stats,
          "No articles extracted from any URL"
        );
      } else {
        await this.healthMonitor.completeRun(runId, stats);
      }

      console.log(
        `[${this.name}] Run complete: found=${items.length}, new=${itemsNew}, ` +
          `updated=${itemsUpdated}`
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.healthMonitor.failRun(runId, err);
      throw err;
    }
  }

  protected resolveUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }

  protected cleanText(text: string | undefined): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }
}
