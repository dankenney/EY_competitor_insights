import { Job } from "bullmq";
import { PrismaClient } from "../../src/generated/prisma";
import { BasePublicationScraper } from "../scrapers/publications/base-publication-scraper";
import { DeloitteScraper } from "../scrapers/publications/deloitte";
import { PwCScraper } from "../scrapers/publications/pwc";
import { KPMGScraper } from "../scrapers/publications/kpmg";
import { McKinseyScraper } from "../scrapers/publications/mckinsey";
import { BCGScraper } from "../scrapers/publications/bcg";
import { ERMScraper } from "../scrapers/publications/erm";
import { WSPScraper } from "../scrapers/publications/wsp";
import { BureauVeritasScraper } from "../scrapers/publications/bureau-veritas";
import { AccentureScraper } from "../scrapers/publications/accenture";
import { EYScraper } from "../scrapers/publications/ey";

const SCRAPER_MAP: Record<
  string,
  new (prisma: PrismaClient) => BasePublicationScraper
> = {
  deloitte: DeloitteScraper,
  pwc: PwCScraper,
  kpmg: KPMGScraper,
  mckinsey: McKinseyScraper,
  bcg: BCGScraper,
  erm: ERMScraper,
  wsp: WSPScraper,
  "bureau-veritas": BureauVeritasScraper,
  accenture: AccentureScraper,
  ey: EYScraper,
};

export async function processPublicationsScrape(
  job: Job,
  prisma: PrismaClient
): Promise<void> {
  console.log(
    `[publications-processor] Starting publications scrape job ${job.id}`
  );

  const competitors = await prisma.competitor.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, publicationUrls: true },
  });

  console.log(
    `[publications-processor] Found ${competitors.length} active competitors`
  );

  let completedCount = 0;
  let errorCount = 0;

  for (const competitor of competitors) {
    const ScraperClass = SCRAPER_MAP[competitor.slug];

    if (!ScraperClass) {
      console.warn(
        `[publications-processor] No scraper registered for competitor "${competitor.slug}" (${competitor.name}). Skipping.`
      );
      continue;
    }

    try {
      console.log(
        `[publications-processor] Running scraper for ${competitor.name} (${competitor.slug})`
      );

      const scraper = new ScraperClass(prisma);

      if (
        competitor.publicationUrls &&
        competitor.publicationUrls.length > 0
      ) {
        scraper.urls = competitor.publicationUrls;
      }

      await scraper.run();
      completedCount++;

      await job.updateProgress(
        Math.round(
          ((completedCount + errorCount) / competitors.length) * 100
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[publications-processor] Scraper failed for ${competitor.name}: ${message}`
      );
      errorCount++;
    }
  }

  console.log(
    `[publications-processor] Job ${job.id} complete: ` +
      `${completedCount} succeeded, ${errorCount} failed out of ${competitors.length} competitors`
  );
}
