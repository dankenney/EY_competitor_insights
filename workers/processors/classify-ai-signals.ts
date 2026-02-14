import { Job } from "bullmq";
import { PrismaClient } from "../../src/generated/prisma";
import { classifyAiSignal } from "../../src/server/ai/pipelines/classify-ai-signal";

const BATCH_SIZE = 5;

export async function processAiPositioningClassify(
  job: Job,
  prisma: PrismaClient
): Promise<void> {
  console.log(
    `[ai-positioning-classify] Starting AI positioning classify job ${job.id}`
  );

  const unclassified = await prisma.aiPositioningSignal.findMany({
    where: { aiClassifiedAt: null },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      publishedAt: true,
      rawContent: true,
      competitorId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (unclassified.length === 0) {
    console.log("[ai-positioning-classify] No unclassified signals found");
    return;
  }

  console.log(
    `[ai-positioning-classify] Found ${unclassified.length} unclassified signals`
  );

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
    const batch = unclassified.slice(i, i + BATCH_SIZE);

    console.log(
      `[ai-positioning-classify] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} ` +
        `(${batch.length} signals)`
    );

    for (const signal of batch) {
      try {
        await classifyAiSignal(signal);
        processed++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[ai-positioning-classify] Error classifying "${signal.title}": ${message}`
        );
        errors++;
      }
    }

    await job.updateProgress(
      Math.round(((i + batch.length) / unclassified.length) * 100)
    );

    if (i + BATCH_SIZE < unclassified.length) {
      console.log("[ai-positioning-classify] Pausing between batches (3s)...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log(
    `[ai-positioning-classify] Job ${job.id} complete: ` +
      `${processed} classified, ${errors} errors out of ${unclassified.length} total`
  );
}
