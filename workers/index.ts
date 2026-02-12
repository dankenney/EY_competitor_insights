import { Worker } from "bullmq";
import { PrismaClient } from "../src/generated/prisma";
import {
  redisConfig,
  publicationsScrapeQueue,
  publicationsClassifyQueue,
  closeQueues,
} from "./queues";
import { processPublicationsScrape } from "./processors/publications";
import { processPublicationsClassify } from "./processors/classify";

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

async function setupRepeatableJobs(): Promise<void> {
  await publicationsScrapeQueue.upsertJobScheduler(
    "publications-scrape-daily",
    {
      every: 24 * 60 * 60 * 1000,
    },
    {
      name: "publications-scrape-scheduled",
      data: { scheduled: true },
    }
  );

  console.log(
    "[worker] Registered repeatable job: publications-scrape (every 24 hours)"
  );

  await publicationsClassifyQueue.upsertJobScheduler(
    "publications-classify-periodic",
    {
      every: 6 * 60 * 60 * 1000,
    },
    {
      name: "publications-classify-scheduled",
      data: { scheduled: true },
    }
  );

  console.log(
    "[worker] Registered repeatable job: publications-classify (every 6 hours)"
  );
}

async function main(): Promise<void> {
  console.log("[worker] CCaSS Competitor Intelligence Worker starting...");
  console.log(
    `[worker] Redis URL: ${process.env.REDIS_URL || "redis://localhost:6379"}`
  );

  const publicationsScrapeWorker = new Worker(
    "publications-scrape",
    async (job) => {
      await processPublicationsScrape(job, prisma);
    },
    {
      connection: redisConfig,
      concurrency: 1,
      limiter: {
        max: 1,
        duration: 60000,
      },
    }
  );

  publicationsScrapeWorker.on("completed", (job) => {
    console.log(`[worker] publications-scrape job ${job.id} completed`);
  });

  publicationsScrapeWorker.on("failed", (job, error) => {
    console.error(
      `[worker] publications-scrape job ${job?.id} failed:`,
      error.message
    );
  });

  const publicationsClassifyWorker = new Worker(
    "publications-classify",
    async (job) => {
      await processPublicationsClassify(job, prisma);
    },
    {
      connection: redisConfig,
      concurrency: 1,
      limiter: {
        max: 5,
        duration: 60000,
      },
    }
  );

  publicationsClassifyWorker.on("completed", (job) => {
    console.log(`[worker] publications-classify job ${job.id} completed`);
  });

  publicationsClassifyWorker.on("failed", (job, error) => {
    console.error(
      `[worker] publications-classify job ${job?.id} failed:`,
      error.message
    );
  });

  const regulatoryScrapeWorker = new Worker(
    "regulatory-scrape",
    async (job) => {
      console.log(
        `[worker] regulatory-scrape job ${job.id} received (processor not yet implemented)`
      );
    },
    {
      connection: redisConfig,
      concurrency: 1,
    }
  );

  regulatoryScrapeWorker.on("completed", (job) => {
    console.log(`[worker] regulatory-scrape job ${job.id} completed`);
  });

  regulatoryScrapeWorker.on("failed", (job, error) => {
    console.error(
      `[worker] regulatory-scrape job ${job?.id} failed:`,
      error.message
    );
  });

  const synthesisWorker = new Worker(
    "synthesis",
    async (job) => {
      console.log(
        `[worker] synthesis job ${job.id} received (processor not yet implemented)`
      );
    },
    {
      connection: redisConfig,
      concurrency: 1,
    }
  );

  synthesisWorker.on("completed", (job) => {
    console.log(`[worker] synthesis job ${job.id} completed`);
  });

  synthesisWorker.on("failed", (job, error) => {
    console.error(
      `[worker] synthesis job ${job?.id} failed:`,
      error.message
    );
  });

  await setupRepeatableJobs();

  console.log("[worker] All workers registered and ready");
  console.log("[worker] Registered queues:");
  console.log("  - publications-scrape (every 24 hours)");
  console.log("  - publications-classify (every 6 hours)");
  console.log("  - regulatory-scrape (manual trigger)");
  console.log("  - synthesis (manual trigger)");

  const workers = [
    publicationsScrapeWorker,
    publicationsClassifyWorker,
    regulatoryScrapeWorker,
    synthesisWorker,
  ];

  async function shutdown(signal: string): Promise<void> {
    console.log(`\n[worker] Received ${signal}. Shutting down gracefully...`);

    for (const worker of workers) {
      console.log(`[worker] Closing worker: ${worker.name}`);
      await worker.close();
    }

    await closeQueues();
    await prisma.$disconnect();

    console.log("[worker] Shutdown complete");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    console.error("[worker] Uncaught exception:", error);
    shutdown("uncaughtException").catch(() => process.exit(1));
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[worker] Unhandled rejection:", reason);
  });
}

main().catch((error) => {
  console.error("[worker] Fatal error during startup:", error);
  process.exit(1);
});
