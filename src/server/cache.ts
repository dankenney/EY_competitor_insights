import { unstable_cache } from "next/cache";

/**
 * Cache tags for tag-based invalidation.
 * Call revalidateTag(tag) when the underlying data changes
 * (e.g., after a classification job completes or new data is uploaded).
 */
export const CACHE_TAGS = {
  /** Invalidate when publications are scraped or classified */
  publications: "publications",
  /** Invalidate when regulatory events are added or classified */
  regulatory: "regulatory",
  /** Invalidate when headcount data is uploaded */
  headcount: "headcount",
  /** Invalidate when talent signal events change */
  talentSignals: "talent-signals",
  /** Invalidate all dashboard-level aggregations */
  dashboard: "dashboard",
  /** Invalidate when competitors are added/modified */
  competitors: "competitors",
} as const;

/**
 * Default cache revalidation period in seconds.
 * Dashboard data only updates every 6-24h via BullMQ jobs,
 * so a 5-minute cache is safe and saves significant DB load.
 */
const DEFAULT_REVALIDATE = 300; // 5 minutes

/**
 * Creates a cached version of a database query function.
 * Uses Next.js Data Cache with tag-based invalidation.
 *
 * @param fn - The async function to cache
 * @param keyParts - Unique key parts for cache identification
 * @param tags - Cache tags for invalidation
 * @param revalidate - Revalidation period in seconds (default 5 minutes)
 */
export function cachedQuery<T>(
  fn: () => Promise<T>,
  keyParts: string[],
  tags: string[],
  revalidate: number = DEFAULT_REVALIDATE
): Promise<T> {
  const cached = unstable_cache(fn, keyParts, {
    revalidate,
    tags,
  });
  return cached();
}
