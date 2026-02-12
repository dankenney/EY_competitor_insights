import * as cheerio from "cheerio";
import { PrismaClient } from "../../../src/generated/prisma";
import { BasePublicationScraper } from "./base-publication-scraper";
import { ScrapedItem } from "../base";

export class KPMGScraper extends BasePublicationScraper {
  private articleSelectors: string[];

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.name = "kpmg-publications";
    this.competitorSlug = "kpmg";
    this.urls = ["https://kpmg.com/xx/en/our-insights/esg.html"];

    this.articleSelectors = [
      ".insights-card a",
      ".content-card a",
      ".listing-card a",
      'a[href*="/our-insights/"]',
      'a[href*="/esg"]',
      ".article-link",
      ".card a",
      ".promo-item a",
      "article a",
      ".feature-card a",
      ".insight-item a",
    ];
  }

  extractArticles($: cheerio.CheerioAPI, sourceUrl: string): ScrapedItem[] {
    const items: ScrapedItem[] = [];
    const seenUrls = new Set<string>();

    for (const selector of this.articleSelectors) {
      $(selector).each((_index, element) => {
        const $el = $(element);
        const href = $el.attr("href");

        if (!href) return;

        const fullUrl = this.resolveUrl(href, sourceUrl);

        if (seenUrls.has(fullUrl)) return;

        const title =
          this.cleanText($el.find("h2, h3, h4, .card-title, .insight-title, .title").first().text()) ||
          this.cleanText($el.attr("title")) ||
          this.cleanText($el.text());

        if (!title || title.length < 5) return;

        const dateText = this.cleanText(
          $el.find("time, .date, .card-date, .publish-date, .meta-date").first().text()
        );

        const excerpt = this.cleanText(
          $el.find("p, .description, .card-description, .excerpt, .summary").first().text()
        );

        seenUrls.add(fullUrl);
        items.push({
          title,
          url: fullUrl,
          date: dateText || undefined,
          excerpt: excerpt || undefined,
          contentType: "Article",
        });
      });
    }

    if (items.length === 0) {
      console.warn(
        `[${this.name}] No articles found on ${sourceUrl}. ` +
          "The page structure may have changed. Consider updating selectors."
      );
    }

    return items;
  }
}
