import * as cheerio from "cheerio";
import { PrismaClient } from "../../../src/generated/prisma";
import { BasePublicationScraper } from "./base-publication-scraper";
import { ScrapedItem } from "../base";

export class ERMScraper extends BasePublicationScraper {
  private articleSelectors: string[];

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.name = "erm-publications";
    this.competitorSlug = "erm";
    this.urls = ["https://www.erm.com/insights/"];

    this.articleSelectors = [
      ".insight-card a",
      ".resource-card a",
      ".content-card a",
      'a[href*="/insights/"]',
      ".article-listing a",
      ".card a",
      "article a",
      ".listing-item a",
      ".resource-item a",
      ".blog-card a",
      ".news-item a",
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
          this.cleanText($el.find("h2, h3, h4, .title, .card-title").first().text()) ||
          this.cleanText($el.attr("title")) ||
          this.cleanText($el.text());

        if (!title || title.length < 5) return;

        const dateText = this.cleanText(
          $el.find("time, .date, .publish-date, .card-date, .meta").first().text()
        );

        const excerpt = this.cleanText(
          $el.find("p, .description, .summary, .card-body, .teaser").first().text()
        );

        const contentType = this.detectContentType($el, $);

        seenUrls.add(fullUrl);
        items.push({
          title,
          url: fullUrl,
          date: dateText || undefined,
          excerpt: excerpt || undefined,
          contentType: contentType || "Article",
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

  private detectContentType(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $el: any,
    _$: cheerio.CheerioAPI
  ): string | undefined {
    const typeTag = this.cleanText(
      $el.find(".type, .content-type, .tag, .label, .category").first().text()
    ).toLowerCase();

    if (typeTag.includes("report")) return "Report";
    if (typeTag.includes("case study")) return "Case Study";
    if (typeTag.includes("whitepaper") || typeTag.includes("white paper"))
      return "Whitepaper";
    if (typeTag.includes("video")) return "Video";
    if (typeTag.includes("webinar")) return "Webinar";
    if (typeTag.includes("podcast")) return "Podcast";
    if (typeTag.includes("blog")) return "Blog Post";

    return undefined;
  }
}
