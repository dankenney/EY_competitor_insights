import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/server/db";
import { Prisma } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const listInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  competitorIds: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  contentTypes: z.array(z.string()).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["publishedDate", "title", "contentType", "primaryTheme", "confidenceScore", "createdAt"])
    .default("publishedDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const getByIdInputSchema = z.object({
  id: z.string().min(1),
});

const getStatsInputSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

const getTrendsInputSchema = z.object({
  months: z.number().int().min(1).max(36).default(12),
  competitorIds: z.array(z.string()).optional(),
});

const getThemeDistributionInputSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

// ---------------------------------------------------------------------------
// Helper: build a date-range where-clause fragment
// ---------------------------------------------------------------------------

function buildDateFilter(dateFrom?: Date, dateTo?: Date): Prisma.PublicationWhereInput {
  if (!dateFrom && !dateTo) return {};

  const publishedDate: Prisma.DateTimeNullableFilter = {};
  if (dateFrom) publishedDate.gte = dateFrom;
  if (dateTo) publishedDate.lte = dateTo;

  return { publishedDate };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const publicationsRouter = router({
  /**
   * list – paginated, filterable list of publications
   */
  list: protectedProcedure.input(listInputSchema).query(async ({ input }) => {
    const { page, limit, competitorIds, themes, contentTypes, dateFrom, dateTo, search, sortBy, sortOrder } = input;

    const where: Prisma.PublicationWhereInput = {
      ...buildDateFilter(dateFrom, dateTo),
      ...(competitorIds && competitorIds.length > 0 ? { competitorId: { in: competitorIds } } : {}),
      ...(themes && themes.length > 0 ? { primaryTheme: { in: themes } } : {}),
      ...(contentTypes && contentTypes.length > 0 ? { contentType: { in: contentTypes } } : {}),
      ...(search
        ? {
            title: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.publication.findMany({
        where,
        include: {
          competitor: {
            select: {
              name: true,
              slug: true,
              brandColor: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.publication.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }),

  /**
   * getById – single publication with full detail
   */
  getById: protectedProcedure.input(getByIdInputSchema).query(async ({ input }) => {
    const publication = await db.publication.findUnique({
      where: { id: input.id },
      include: {
        competitor: {
          select: {
            id: true,
            name: true,
            slug: true,
            shortName: true,
            category: true,
            brandColor: true,
          },
        },
      },
    });

    if (!publication) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Publication with id "${input.id}" not found.`,
      });
    }

    return publication;
  }),

  /**
   * getStats – summary statistics for dashboard cards
   */
  getStats: protectedProcedure.input(getStatsInputSchema).query(async ({ input }) => {
    const dateFilter = buildDateFilter(input.dateFrom, input.dateTo);

    const [total, byCompetitorRaw, byThemeRaw, byContentTypeRaw, classified, unclassified] = await Promise.all([
      // Total publications count
      db.publication.count({ where: dateFilter }),

      // Group by competitor
      db.publication.groupBy({
        by: ["competitorId"],
        where: dateFilter,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // Group by theme
      db.publication.groupBy({
        by: ["primaryTheme"],
        where: {
          ...dateFilter,
          primaryTheme: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // Group by content type
      db.publication.groupBy({
        by: ["contentType"],
        where: {
          ...dateFilter,
          contentType: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // Classified count (has aiClassifiedAt)
      db.publication.count({
        where: {
          ...dateFilter,
          aiClassifiedAt: { not: null },
        },
      }),

      // Unclassified count
      db.publication.count({
        where: {
          ...dateFilter,
          aiClassifiedAt: null,
        },
      }),
    ]);

    // Hydrate competitor info
    const competitorIds = byCompetitorRaw.map((r) => r.competitorId);
    const competitors = await db.competitor.findMany({
      where: { id: { in: competitorIds } },
      select: { id: true, name: true, slug: true, brandColor: true },
    });
    const competitorMap = new Map(competitors.map((c) => [c.id, c]));

    const byCompetitor = byCompetitorRaw.map((r) => {
      const comp = competitorMap.get(r.competitorId);
      return {
        competitorId: r.competitorId,
        competitorName: comp?.name ?? "Unknown",
        slug: comp?.slug ?? "unknown",
        brandColor: comp?.brandColor ?? "#888888",
        count: r._count.id,
      };
    });

    const byTheme = byThemeRaw.map((r) => ({
      theme: r.primaryTheme ?? "Unclassified",
      count: r._count.id,
    }));

    const byContentType = byContentTypeRaw.map((r) => ({
      contentType: r.contentType ?? "Unknown",
      count: r._count.id,
    }));

    return {
      total,
      byCompetitor,
      byTheme,
      byContentType,
      classified,
      unclassified,
    };
  }),

  /**
   * getTrends – monthly publication counts per competitor for trend charts
   */
  getTrends: protectedProcedure.input(getTrendsInputSchema).query(async ({ input }) => {
    const { months, competitorIds } = input;

    // Calculate date boundary
    const now = new Date();
    const dateFrom = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const where: Prisma.PublicationWhereInput = {
      publishedDate: { gte: dateFrom },
      ...(competitorIds && competitorIds.length > 0 ? { competitorId: { in: competitorIds } } : {}),
    };

    // Fetch publications with dates in range
    const publications = await db.publication.findMany({
      where,
      select: {
        publishedDate: true,
        competitorId: true,
        competitor: {
          select: { slug: true, name: true, brandColor: true },
        },
      },
      orderBy: { publishedDate: "asc" },
    });

    // Collect all competitor slugs that appear in results
    const competitorSlugs = new Map<string, { name: string; brandColor: string | null }>();

    // Build month buckets
    const monthBuckets = new Map<string, Record<string, number>>();

    for (let i = 0; i < months; i++) {
      const d = new Date(dateFrom.getFullYear(), dateFrom.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthBuckets.set(key, {});
    }

    for (const pub of publications) {
      if (!pub.publishedDate) continue;

      const d = pub.publishedDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const bucket = monthBuckets.get(key);
      if (!bucket) continue;

      const slug = pub.competitor.slug;
      bucket[slug] = (bucket[slug] ?? 0) + 1;

      if (!competitorSlugs.has(slug)) {
        competitorSlugs.set(slug, {
          name: pub.competitor.name,
          brandColor: pub.competitor.brandColor,
        });
      }
    }

    // Convert to array for the chart
    const trends = Array.from(monthBuckets.entries()).map(([month, counts]) => {
      const row: Record<string, string | number> = { month };
      for (const slug of competitorSlugs.keys()) {
        row[slug] = counts[slug] ?? 0;
      }
      return row;
    });

    // Also return competitor metadata so the chart knows colors
    const competitors = Array.from(competitorSlugs.entries()).map(([slug, info]) => ({
      slug,
      name: info.name,
      brandColor: info.brandColor,
    }));

    return { trends, competitors };
  }),

  /**
   * getThemeDistribution – themes per competitor for the heatmap
   */
  getThemeDistribution: protectedProcedure.input(getThemeDistributionInputSchema).query(async ({ input }) => {
    const dateFilter = buildDateFilter(input.dateFrom, input.dateTo);

    const raw = await db.publication.groupBy({
      by: ["competitorId", "primaryTheme"],
      where: {
        ...dateFilter,
        primaryTheme: { not: null },
      },
      _count: { id: true },
    });

    // Collect competitor ids
    const competitorIds = [...new Set(raw.map((r) => r.competitorId))];
    const competitors = await db.competitor.findMany({
      where: { id: { in: competitorIds } },
      select: { id: true, name: true, slug: true, brandColor: true },
    });
    const competitorMap = new Map(competitors.map((c) => [c.id, c]));

    // Group by competitor
    const grouped = new Map<
      string,
      { competitorName: string; slug: string; brandColor: string | null; themes: Map<string, number> }
    >();

    for (const row of raw) {
      const comp = competitorMap.get(row.competitorId);
      if (!comp) continue;

      if (!grouped.has(row.competitorId)) {
        grouped.set(row.competitorId, {
          competitorName: comp.name,
          slug: comp.slug,
          brandColor: comp.brandColor,
          themes: new Map(),
        });
      }

      const entry = grouped.get(row.competitorId)!;
      entry.themes.set(row.primaryTheme ?? "Unclassified", row._count.id);
    }

    return Array.from(grouped.values()).map((entry) => ({
      competitorName: entry.competitorName,
      slug: entry.slug,
      brandColor: entry.brandColor,
      themes: Array.from(entry.themes.entries()).map(([theme, count]) => ({
        theme,
        count,
      })),
    }));
  }),
});

export type PublicationsRouter = typeof publicationsRouter;
