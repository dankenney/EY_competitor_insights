import * as cheerio from "cheerio";
import { PrismaClient } from "../../../src/generated/prisma";
import { BasePublicationScraper } from "./base-publication-scraper";
import { ScrapedItem } from "../base";

export class McKinseyScraper extends BasePublicationScraper {
  private articleSelectors: string[];

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.name = "mckinsey-publications";
    this.competitorSlug = "mckinsey";
    this.urls = [
      "https://www.mckinsey.com/capabilities/sustainability/our-insights",
    ];

    this.articleSelectors = [
      ".article-block a",
      ".insights-card a",
      ".content-card a",
      'a[href*="/our-insights/"]',
      'a[href*="/sustainability/"]',
      ".item-card a",
      ".card a",
      "article a",
      ".listing-item a",
      ".featured-article a",
      ".insight-card a",
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
          this.cleanText($el.find("h2, h3, h4, .title, .headline, .card-title").first().text()) ||
          this.cleanText($el.attr("title")) ||
          this.cleanText($el.text());

        if (!title || title.length < 5) return;

        const dateText = this.cleanText(
          $el.find("time, .date, .publish-date, .byline-date, .meta-date").first().text()
        );

        const excerpt = this.cleanText(
          $el.find("p, .description, .summary, .abstract, .card-body").first().text()
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
