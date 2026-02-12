import * as cheerio from "cheerio";
import { PrismaClient } from "../../../src/generated/prisma";
import { BasePublicationScraper } from "./base-publication-scraper";
import { ScrapedItem } from "../base";

export class DeloitteScraper extends BasePublicationScraper {
  private articleSelectors: string[];

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.name = "deloitte-publications";
    this.competitorSlug = "deloitte";
    this.urls = ["https://www.deloitte.com/global/en/issues/climate.html"];

    this.articleSelectors = [
      "a.article-card",
      ".promo-card a",
      ".content-card a",
      'a[href*="/insights/"]',
      'a[href*="/issues/climate"]',
      ".featured-content a",
      ".card-wrapper a",
      "article a",
      ".spotlight-card a",
      ".content-listing a",
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
          this.cleanText($el.find("h2, h3, h4, .card-title, .title").first().text()) ||
          this.cleanText($el.attr("title")) ||
          this.cleanText($el.text());

        if (!title || title.length < 5) return;

        const dateText = this.cleanText(
          $el.find("time, .date, .card-date, .publish-date, span[data-date]").first().text()
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
