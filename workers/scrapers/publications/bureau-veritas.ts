import * as cheerio from "cheerio";
import { PrismaClient } from "../../../src/generated/prisma";
import { BasePublicationScraper } from "./base-publication-scraper";
import { ScrapedItem } from "../base";

export class BureauVeritasScraper extends BasePublicationScraper {
  private articleSelectors: string[];

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.name = "bureau-veritas-publications";
    this.competitorSlug = "bureau-veritas";
    this.urls = ["https://group.bureauveritas.com/magazine"];

    this.articleSelectors = [
      ".magazine-article a",
      ".content-card a",
      ".article-card a",
      'a[href*="/magazine/"]',
      'a[href*="/news/"]',
      ".card a",
      ".listing-item a",
      "article a",
      ".teaser a",
      ".news-article a",
      ".editorial-card a",
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
          this.cleanText($el.find("h2, h3, h4, .title, .card-title, .article-title").first().text()) ||
          this.cleanText($el.attr("title")) ||
          this.cleanText($el.text());

        if (!title || title.length < 5) return;

        const dateText = this.cleanText(
          $el.find("time, .date, .publish-date, .card-date, .article-date").first().text()
        );

        const excerpt = this.cleanText(
          $el.find("p, .description, .summary, .card-body, .intro, .chapo").first().text()
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
