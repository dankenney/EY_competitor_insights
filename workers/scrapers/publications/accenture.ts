import * as cheerio from "cheerio";
import { PrismaClient } from "../../../src/generated/prisma";
import { BasePublicationScraper } from "./base-publication-scraper";
import { ScrapedItem } from "../base";

export class AccentureScraper extends BasePublicationScraper {
  private articleSelectors: string[];

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.name = "accenture-publications";
    this.competitorSlug = "accenture";
    this.urls = [
      "https://www.accenture.com/us-en/insights/sustainability-index",
    ];

    this.articleSelectors = [
      ".insight-card a",
      ".content-card a",
      ".article-card a",
      'a[href*="/insights/"]',
      'a[href*="/sustainability"]',
      ".card a",
      ".listing-item a",
      "article a",
      ".promo-card a",
      ".featured-content a",
      ".teaser-card a",
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
        if (fullUrl === sourceUrl) return;

        const title =
          this.cleanText($el.find("h2, h3, h4, .title, .card-title, .heading").first().text()) ||
          this.cleanText($el.attr("title")) ||
          this.cleanText($el.text());

        if (!title || title.length < 5) return;

        const dateText = this.cleanText(
          $el.find("time, .date, .publish-date, .card-date, .meta-date").first().text()
        );

        const excerpt = this.cleanText(
          $el.find("p, .description, .summary, .card-body, .abstract").first().text()
        );

        seenUrls.add(fullUrl);
        items.push({
          title,
          url: fullUrl,
          date: dateText || undefined,
          excerpt: excerpt || undefined,
          contentType: "Thought Leadership",
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
