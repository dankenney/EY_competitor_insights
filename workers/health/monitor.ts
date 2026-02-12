import { PrismaClient } from "../../src/generated/prisma";

export interface RunStats {
  itemsFound: number;
  itemsNew: number;
  itemsUpdated: number;
}

export class ScraperHealthMonitor {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async startRun(scraperName: string): Promise<string> {
    const run = await this.prisma.scraperRun.create({
      data: {
        scraperName,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    console.log(`[health] Started scraper run ${run.id} for "${scraperName}"`);
    return run.id;
  }

  async completeRun(runId: string, stats: RunStats): Promise<void> {
    const run = await this.prisma.scraperRun.findUnique({
      where: { id: runId },
    });

    const now = new Date();
    const durationMs = run ? now.getTime() - run.startedAt.getTime() : 0;

    await this.prisma.scraperRun.update({
      where: { id: runId },
      data: {
        status: "SUCCESS",
        itemsFound: stats.itemsFound,
        itemsNew: stats.itemsNew,
        itemsUpdated: stats.itemsUpdated,
        completedAt: now,
        durationMs,
      },
    });

    console.log(
      `[health] Completed run ${runId}: found=${stats.itemsFound}, ` +
        `new=${stats.itemsNew}, updated=${stats.itemsUpdated}, duration=${durationMs}ms`
    );
  }

  async failRun(runId: string, error: Error): Promise<void> {
    const run = await this.prisma.scraperRun.findUnique({
      where: { id: runId },
    });

    const now = new Date();
    const durationMs = run ? now.getTime() - run.startedAt.getTime() : 0;

    await this.prisma.scraperRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        errorMessage: error.message,
        errorStack: error.stack ?? null,
        completedAt: now,
        durationMs,
      },
    });

    console.error(`[health] Run ${runId} FAILED: ${error.message}`);
  }

  async partialSuccess(
    runId: string,
    stats: RunStats,
    errorMessage: string
  ): Promise<void> {
    const run = await this.prisma.scraperRun.findUnique({
      where: { id: runId },
    });

    const now = new Date();
    const durationMs = run ? now.getTime() - run.startedAt.getTime() : 0;

    await this.prisma.scraperRun.update({
      where: { id: runId },
      data: {
        status: "PARTIAL_SUCCESS",
        itemsFound: stats.itemsFound,
        itemsNew: stats.itemsNew,
        itemsUpdated: stats.itemsUpdated,
        errorMessage,
        completedAt: now,
        durationMs,
      },
    });

    console.warn(
      `[health] Run ${runId} PARTIAL_SUCCESS: found=${stats.itemsFound}, ` +
        `new=${stats.itemsNew}, updated=${stats.itemsUpdated}, error="${errorMessage}"`
    );
  }
}
