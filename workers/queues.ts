import { Queue, type ConnectionOptions } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url: string): ConnectionOptions {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) || 0 : 0,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  } catch {
    return {
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }
}

export const redisConfig: ConnectionOptions = parseRedisUrl(REDIS_URL);

export const publicationsScrapeQueue = new Queue("publications-scrape", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,
      count: 100,
    },
    removeOnFail: {
      age: 30 * 24 * 3600,
      count: 500,
    },
  },
});

export const publicationsClassifyQueue = new Queue("publications-classify", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,
      count: 100,
    },
    removeOnFail: {
      age: 30 * 24 * 3600,
      count: 500,
    },
  },
});

export const regulatoryScrapeQueue = new Queue("regulatory-scrape", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,
      count: 100,
    },
    removeOnFail: {
      age: 30 * 24 * 3600,
      count: 500,
    },
  },
});

export const aiPositioningClassifyQueue = new Queue("ai-positioning-classify", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,
      count: 100,
    },
    removeOnFail: {
      age: 30 * 24 * 3600,
      count: 500,
    },
  },
});

export const synthesisQueue = new Queue("synthesis", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 15000,
    },
    removeOnComplete: {
      age: 30 * 24 * 3600,
      count: 50,
    },
    removeOnFail: {
      age: 60 * 24 * 3600,
      count: 100,
    },
  },
});

export async function closeQueues(): Promise<void> {
  await Promise.all([
    publicationsScrapeQueue.close(),
    publicationsClassifyQueue.close(),
    regulatoryScrapeQueue.close(),
    aiPositioningClassifyQueue.close(),
    synthesisQueue.close(),
  ]);
}
