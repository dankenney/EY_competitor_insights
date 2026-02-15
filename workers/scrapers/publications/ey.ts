import * as cheerio from "cheerio";
import { PrismaClient } from "../../../src/generated/prisma";
import { BasePublicationScraper } from "./base-publication-scraper";
import { ScrapedItem } from "../base";

export class EYScraper extends BasePublicationScraper {
  private articleSelectors: string[];

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.name = "ey-publications";
    this.competitorSlug = "ey";
    this.urls = ["https://www.ey.com/en_gl/services/climate-change-sustainability-services"];

    this.articleSelectors = [
      ".article-card a",
      ".content-card a",
      ".insight-card a",
      'a[href*="/insights/"]',
      'a[href*="/sustainability"]',
      ".promo-card a",
      ".card a",
      "article a",
      ".listing-item a",
      ".featured-content a",
      ".ey-card a",
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
          $el.find("p, .description, .summary, .card-body, .abstract, .intro").first().text()
        );

        const authors: string[] = [];
        $el.find(".author, .byline, .author-name").each((_i, authorEl) => {
          const authorName = this.cleanText($(authorEl).text());
          if (authorName) authors.push(authorName);
        });

        seenUrls.add(fullUrl);
        items.push({
          title,
          url: fullUrl,
          date: dateText || undefined,
          excerpt: excerpt || undefined,
          authors: authors.length > 0 ? authors : undefined,
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
