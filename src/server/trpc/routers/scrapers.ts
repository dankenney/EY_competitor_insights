import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { publicationsScrapeQueue } from "../../../../workers/queues";

const RECENT_RUN_LIMIT = 20;
const SUMMARY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const scrapersRouter = createTRPCRouter({
  status: adminProcedure.query(async ({ ctx }) => {
    const windowStart = new Date(Date.now() - SUMMARY_WINDOW_MS);

    const [
      recentRuns,
      totalRuns24h,
      successRuns24h,
      failedRuns24h,
      runningNow,
      lastSuccessfulRun,
    ] = await Promise.all([
      ctx.db.scraperRun.findMany({
        orderBy: { startedAt: "desc" },
        take: RECENT_RUN_LIMIT,
        select: {
          id: true,
          scraperName: true,
          status: true,
          itemsFound: true,
          itemsNew: true,
          itemsUpdated: true,
          errorMessage: true,
          durationMs: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      ctx.db.scraperRun.count({
        where: { startedAt: { gte: windowStart } },
      }),
      ctx.db.scraperRun.count({
        where: {
          startedAt: { gte: windowStart },
          status: "SUCCESS",
        },
      }),
      ctx.db.scraperRun.count({
        where: {
          startedAt: { gte: windowStart },
          status: "FAILED",
        },
      }),
      ctx.db.scraperRun.count({
        where: { status: "RUNNING" },
      }),
      ctx.db.scraperRun.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { completedAt: "desc" },
        select: {
          id: true,
          scraperName: true,
          status: true,
          itemsFound: true,
          itemsNew: true,
          itemsUpdated: true,
          errorMessage: true,
          durationMs: true,
          startedAt: true,
          completedAt: true,
        },
      }),
    ]);

    const latestByScraper = [];
    const seen = new Set<string>();

    for (const run of recentRuns) {
      if (seen.has(run.scraperName)) {
        continue;
      }

      seen.add(run.scraperName);
      latestByScraper.push(run);
    }

    let queue = {
      active: 0,
      waiting: 0,
      delayed: 0,
      failed: 0,
      error: null as string | null,
    };

    try {
      const counts = await publicationsScrapeQueue.getJobCounts(
        "active",
        "waiting",
        "delayed",
        "failed"
      );

      queue = {
        active: counts.active ?? 0,
        waiting: counts.waiting ?? 0,
        delayed: counts.delayed ?? 0,
        failed: counts.failed ?? 0,
        error: null,
      };
    } catch (error) {
      queue.error =
        error instanceof Error
          ? error.message
          : "Unable to connect to the publications queue.";
    }

    return {
      queue,
      summary: {
        totalRuns24h,
        successRuns24h,
        failedRuns24h,
        runningNow,
      },
      lastSuccessfulRun,
      latestByScraper,
      recentRuns,
    };
  }),

  triggerPublicationsRefresh: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const counts = await publicationsScrapeQueue.getJobCounts(
        "active",
        "waiting"
      );

      if ((counts.active ?? 0) + (counts.waiting ?? 0) > 0) {
        return {
          queued: false,
          message:
            "A publications refresh is already running or waiting in the queue.",
        };
      }

      const job = await publicationsScrapeQueue.add("publications-scrape-manual", {
        source: "admin-ui",
        triggeredAt: new Date().toISOString(),
        triggeredBy: ctx.session.user.email ?? ctx.session.user.id,
      });

      return {
        queued: true,
        jobId: String(job.id),
        message:
          "Publications refresh queued. Classification will run automatically after scraping completes.",
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Unable to queue a publications refresh. Check Redis and the worker service.",
        cause: error,
      });
    }
  }),
});
