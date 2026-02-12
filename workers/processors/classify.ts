import { Job } from "bullmq";
import { PrismaClient } from "../../src/generated/prisma";
import { classifyPublication } from "../../src/server/ai/pipelines/classify-publication";

const BATCH_SIZE = 10;

export async function processPublicationsClassify(
  job: Job,
  prisma: PrismaClient
): Promise<void> {
  console.log(
    `[classify-processor] Starting publications classify job ${job.id}`
  );

  const unclassified = await prisma.publication.findMany({
    where: { aiClassifiedAt: null },
    select: {
      id: true,
      title: true,
      url: true,
      publishedDate: true,
      extractedText: true,
      competitorId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (unclassified.length === 0) {
    console.log("[classify-processor] No unclassified publications found");
    return;
  }

  console.log(
    `[classify-processor] Found ${unclassified.length} unclassified publications`
  );

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
    const batch = unclassified.slice(i, i + BATCH_SIZE);

    console.log(
      `[classify-processor] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} ` +
        `(${batch.length} publications)`
    );

    for (const publication of batch) {
      try {
        await classifyPublication(publication);
        processed++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[classify-processor] Error classifying "${publication.title}": ${message}`
        );
        errors++;
      }
    }

    await job.updateProgress(
      Math.round(((i + batch.length) / unclassified.length) * 100)
    );

    if (i + BATCH_SIZE < unclassified.length) {
      console.log("[classify-processor] Pausing between batches (2s)...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(
    `[classify-processor] Job ${job.id} complete: ` +
      `${processed} classified, ${errors} errors out of ${unclassified.length} total`
  );
}
