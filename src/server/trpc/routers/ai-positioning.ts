import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/server/db";
import { Prisma } from "@/generated/prisma";
import { cachedQuery, CACHE_TAGS } from "@/server/cache";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const listInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  competitorIds: z.array(z.string()).optional(),
  signalTypes: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  maturityLevels: z.array(z.string()).optional(),
  realityScoreMin: z.number().min(0).max(1).optional(),
  realityScoreMax: z.number().min(0).max(1).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  search: z.string().optional(),
  significantOnly: z.boolean().optional(),
  sortBy: z
    .enum([
      "publishedAt",
      "realityScore",
      "title",
      "signalType",
      "maturityLevel",
      "createdAt",
    ])
    .default("publishedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const getByIdInputSchema = z.object({
  id: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Helper: build where-clause
// ---------------------------------------------------------------------------

function buildWhere(input: z.infer<typeof listInputSchema>): Prisma.AiPositioningSignalWhereInput {
  const where: Prisma.AiPositioningSignalWhereInput = {};

  if (input.competitorIds && input.competitorIds.length > 0) {
    where.competitorId = { in: input.competitorIds };
  }
  if (input.signalTypes && input.signalTypes.length > 0) {
    where.signalType = { in: input.signalTypes };
  }
  if (input.categories && input.categories.length > 0) {
    where.aiCapabilityCategory = { in: input.categories };
  }
  if (input.maturityLevels && input.maturityLevels.length > 0) {
    where.maturityLevel = { in: input.maturityLevels };
  }
  if (input.realityScoreMin !== undefined || input.realityScoreMax !== undefined) {
    const realityScore: Prisma.FloatNullableFilter = {};
    if (input.realityScoreMin !== undefined) realityScore.gte = input.realityScoreMin;
    if (input.realityScoreMax !== undefined) realityScore.lte = input.realityScoreMax;
    where.realityScore = realityScore;
  }
  if (input.dateFrom || input.dateTo) {
    const publishedAt: Prisma.DateTimeNullableFilter = {};
    if (input.dateFrom) publishedAt.gte = input.dateFrom;
    if (input.dateTo) publishedAt.lte = input.dateTo;
    where.publishedAt = publishedAt;
  }
  if (input.search) {
    where.title = { contains: input.search, mode: Prisma.QueryMode.insensitive };
  }
  if (input.significantOnly) {
    where.isSignificant = true;
  }

  return where;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const aiPositioningRouter = router({
  /**
   * listSignals – paginated, filterable list of AI positioning signals
   */
  listSignals: protectedProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder } = input;
      const where = buildWhere(input);

      const [items, total] = await Promise.all([
        db.aiPositioningSignal.findMany({
          where,
          include: {
            competitor: {
              select: { name: true, slug: true, brandColor: true },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.aiPositioningSignal.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * getSignalById – single signal with full detail
   */
  getSignalById: protectedProcedure
    .input(getByIdInputSchema)
    .query(async ({ input }) => {
      const signal = await db.aiPositioningSignal.findUnique({
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

      if (!signal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `AI positioning signal with id "${input.id}" not found.`,
        });
      }

      return signal;
    }),

  /**
   * getStats – summary statistics for dashboard cards
   */
  getStats: protectedProcedure.query(async () => {
    return cachedQuery(
      async () => {
        const [
          totalSignals,
          byCompetitorRaw,
          byCategoryRaw,
          byMaturityRaw,
          bySignalTypeRaw,
          avgReality,
          partnerships,
        ] = await Promise.all([
          db.aiPositioningSignal.count(),
          db.aiPositioningSignal.groupBy({
            by: ["competitorId"],
            _count: { id: true },
            _avg: { realityScore: true },
            orderBy: { _count: { id: "desc" } },
          }),
          db.aiPositioningSignal.groupBy({
            by: ["aiCapabilityCategory"],
            where: { aiCapabilityCategory: { not: null } },
            _count: { id: true },
            _avg: { realityScore: true },
            orderBy: { _count: { id: "desc" } },
          }),
          db.aiPositioningSignal.groupBy({
            by: ["maturityLevel"],
            where: { maturityLevel: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
          }),
          db.aiPositioningSignal.groupBy({
            by: ["signalType"],
            where: { signalType: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
          }),
          db.aiPositioningSignal.aggregate({
            _avg: { realityScore: true },
          }),
          db.aiPositioningSignal.count({
            where: { partnerName: { not: null } },
          }),
        ]);

        // Hydrate competitor names
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
            avgRealityScore: r._avg.realityScore,
          };
        });

        // Find the most active competitor
        const mostActive = byCompetitor[0] ?? null;

        return {
          totalSignals,
          avgRealityScore:
            Math.round((avgReality._avg.realityScore ?? 0) * 100) / 100,
          partnerships,
          mostActiveCompetitor: mostActive
            ? { name: mostActive.competitorName, count: mostActive.count }
            : null,
          byCompetitor,
          byCategory: byCategoryRaw.map((r) => ({
            category: r.aiCapabilityCategory ?? "Unknown",
            count: r._count.id,
            avgRealityScore:
              Math.round((r._avg.realityScore ?? 0) * 100) / 100,
          })),
          byMaturity: byMaturityRaw.map((r) => ({
            maturityLevel: r.maturityLevel ?? "Unknown",
            count: r._count.id,
          })),
          bySignalType: bySignalTypeRaw.map((r) => ({
            signalType: r.signalType ?? "Unknown",
            count: r._count.id,
          })),
        };
      },
      ["ai-positioning-stats"],
      [CACHE_TAGS.aiPositioning, CACHE_TAGS.dashboard]
    );
  }),

  /**
   * getCapabilityMatrix – competitors × AI categories grid
   * Returns count + avg reality score per cell for the heatmap
   */
  getCapabilityMatrix: protectedProcedure.query(async () => {
    return cachedQuery(
      async () => {
        const raw = await db.aiPositioningSignal.groupBy({
          by: ["competitorId", "aiCapabilityCategory"],
          where: { aiCapabilityCategory: { not: null } },
          _count: { id: true },
          _avg: { realityScore: true },
        });

        // Hydrate competitor names
        const competitorIds = [...new Set(raw.map((r) => r.competitorId))];
        const competitors = await db.competitor.findMany({
          where: { id: { in: competitorIds } },
          select: { id: true, name: true, slug: true, brandColor: true },
        });
        const competitorMap = new Map(competitors.map((c) => [c.id, c]));

        // Group by competitor
        const grouped = new Map<
          string,
          {
            competitorName: string;
            slug: string;
            brandColor: string | null;
            categories: Map<string, { count: number; avgRealityScore: number }>;
          }
        >();

        for (const row of raw) {
          const comp = competitorMap.get(row.competitorId);
          if (!comp) continue;

          if (!grouped.has(row.competitorId)) {
            grouped.set(row.competitorId, {
              competitorName: comp.name,
              slug: comp.slug,
              brandColor: comp.brandColor,
              categories: new Map(),
            });
          }

          const entry = grouped.get(row.competitorId)!;
          entry.categories.set(row.aiCapabilityCategory ?? "Unknown", {
            count: row._count.id,
            avgRealityScore:
              Math.round((row._avg.realityScore ?? 0) * 100) / 100,
          });
        }

        return Array.from(grouped.values()).map((entry) => ({
          competitorName: entry.competitorName,
          slug: entry.slug,
          brandColor: entry.brandColor,
          categories: Array.from(entry.categories.entries()).map(
            ([category, data]) => ({
              category,
              count: data.count,
              avgRealityScore: data.avgRealityScore,
            })
          ),
        }));
      },
      ["ai-positioning-capability-matrix"],
      [CACHE_TAGS.aiPositioning]
    );
  }),

  /**
   * getHypeQuadrant – per-competitor data for scatter chart
   * x = avg reality score, y = maturity index, size = signal count
   */
  getHypeQuadrant: protectedProcedure.query(async () => {
    return cachedQuery(
      async () => {
        const maturityIndex: Record<string, number> = {
          Announced: 1,
          Pilot: 2,
          Deployed: 3,
          Scaled: 4,
        };

        const signals = await db.aiPositioningSignal.findMany({
          where: {
            realityScore: { not: null },
            maturityLevel: { not: null },
          },
          select: {
            competitorId: true,
            realityScore: true,
            maturityLevel: true,
            competitor: {
              select: { name: true, slug: true, brandColor: true },
            },
          },
        });

        // Group by competitor and compute averages
        const grouped = new Map<
          string,
          {
            name: string;
            slug: string;
            brandColor: string | null;
            realityScores: number[];
            maturityValues: number[];
          }
        >();

        for (const s of signals) {
          if (!grouped.has(s.competitorId)) {
            grouped.set(s.competitorId, {
              name: s.competitor.name,
              slug: s.competitor.slug,
              brandColor: s.competitor.brandColor,
              realityScores: [],
              maturityValues: [],
            });
          }
          const entry = grouped.get(s.competitorId)!;
          entry.realityScores.push(s.realityScore!);
          entry.maturityValues.push(
            maturityIndex[s.maturityLevel ?? "Announced"] ?? 1
          );
        }

        return Array.from(grouped.values()).map((entry) => {
          const avgReality =
            Math.round(
              (entry.realityScores.reduce((a, b) => a + b, 0) /
                entry.realityScores.length) *
                100
            ) / 100;
          const avgMaturity =
            Math.round(
              (entry.maturityValues.reduce((a, b) => a + b, 0) /
                entry.maturityValues.length) *
                100
            ) / 100;

          return {
            name: entry.name,
            slug: entry.slug,
            brandColor: entry.brandColor,
            avgRealityScore: avgReality,
            avgMaturity,
            signalCount: entry.realityScores.length,
          };
        });
      },
      ["ai-positioning-hype-quadrant"],
      [CACHE_TAGS.aiPositioning]
    );
  }),

  /**
   * getPartnerships – signals with named partners, grouped by competitor
   */
  getPartnerships: protectedProcedure.query(async () => {
    return cachedQuery(
      async () => {
        const signals = await db.aiPositioningSignal.findMany({
          where: { partnerName: { not: null } },
          select: {
            id: true,
            title: true,
            partnerName: true,
            partnerType: true,
            aiCapabilityCategory: true,
            maturityLevel: true,
            realityScore: true,
            publishedAt: true,
            competitor: {
              select: { name: true, slug: true, brandColor: true },
            },
          },
          orderBy: { publishedAt: "desc" },
        });

        return signals.map((s) => ({
          id: s.id,
          title: s.title,
          competitorName: s.competitor.name,
          competitorSlug: s.competitor.slug,
          brandColor: s.competitor.brandColor,
          partnerName: s.partnerName,
          partnerType: s.partnerType,
          category: s.aiCapabilityCategory,
          maturityLevel: s.maturityLevel,
          realityScore: s.realityScore,
          publishedAt: s.publishedAt,
        }));
      },
      ["ai-positioning-partnerships"],
      [CACHE_TAGS.aiPositioning]
    );
  }),

  /**
   * getTimeline – monthly signal counts per competitor
   */
  getTimeline: protectedProcedure
    .input(
      z.object({
        months: z.number().int().min(1).max(24).default(12),
      })
    )
    .query(async ({ input }) => {
      return cachedQuery(
        async () => {
          const now = new Date();
          const dateFrom = new Date(
            now.getFullYear(),
            now.getMonth() - input.months + 1,
            1
          );

          const signals = await db.aiPositioningSignal.findMany({
            where: { publishedAt: { gte: dateFrom } },
            select: {
              publishedAt: true,
              competitorId: true,
              competitor: {
                select: { slug: true, name: true, brandColor: true },
              },
            },
            orderBy: { publishedAt: "asc" },
          });

          const competitorSlugs = new Map<
            string,
            { name: string; brandColor: string | null }
          >();
          const monthBuckets = new Map<string, Record<string, number>>();

          for (let i = 0; i < input.months; i++) {
            const d = new Date(
              dateFrom.getFullYear(),
              dateFrom.getMonth() + i,
              1
            );
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            monthBuckets.set(key, {});
          }

          for (const s of signals) {
            if (!s.publishedAt) continue;
            const d = s.publishedAt;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const bucket = monthBuckets.get(key);
            if (!bucket) continue;

            const slug = s.competitor.slug;
            bucket[slug] = (bucket[slug] ?? 0) + 1;

            if (!competitorSlugs.has(slug)) {
              competitorSlugs.set(slug, {
                name: s.competitor.name,
                brandColor: s.competitor.brandColor,
              });
            }
          }

          const timeline = Array.from(monthBuckets.entries()).map(
            ([month, counts]) => {
              const row: { month: string; [key: string]: string | number } = {
                month,
              };
              for (const slug of competitorSlugs.keys()) {
                row[slug] = counts[slug] ?? 0;
              }
              return row;
            }
          );

          const competitors = Array.from(competitorSlugs.entries()).map(
            ([slug, info]) => ({
              slug,
              name: info.name,
              brandColor: info.brandColor,
            })
          );

          return { timeline, competitors };
        },
        [`ai-positioning-timeline-${input.months}`],
        [CACHE_TAGS.aiPositioning]
      );
    }),

  /**
   * getEyComparison – EY's scores vs competitor averages per category
   */
  getEyComparison: protectedProcedure.query(async () => {
    return cachedQuery(
      async () => {
        const eyCompetitor = await db.competitor.findUnique({
          where: { slug: "ey" },
          select: { id: true },
        });

        if (!eyCompetitor) return { categories: [] };

        const [eySignals, allSignals] = await Promise.all([
          db.aiPositioningSignal.groupBy({
            by: ["aiCapabilityCategory"],
            where: {
              competitorId: eyCompetitor.id,
              aiCapabilityCategory: { not: null },
              realityScore: { not: null },
            },
            _count: { id: true },
            _avg: { realityScore: true },
          }),
          db.aiPositioningSignal.groupBy({
            by: ["aiCapabilityCategory"],
            where: {
              competitorId: { not: eyCompetitor.id },
              aiCapabilityCategory: { not: null },
              realityScore: { not: null },
            },
            _count: { id: true },
            _avg: { realityScore: true },
          }),
        ]);

        const eyMap = new Map(
          eySignals.map((r) => [
            r.aiCapabilityCategory,
            {
              count: r._count.id,
              avgReality:
                Math.round((r._avg.realityScore ?? 0) * 100) / 100,
            },
          ])
        );

        const othersMap = new Map(
          allSignals.map((r) => [
            r.aiCapabilityCategory,
            {
              count: r._count.id,
              avgReality:
                Math.round((r._avg.realityScore ?? 0) * 100) / 100,
            },
          ])
        );

        // Combine all categories
        const allCategories = new Set([
          ...eyMap.keys(),
          ...othersMap.keys(),
        ]);

        const categories = Array.from(allCategories).map((cat) => ({
          category: cat ?? "Unknown",
          eyScore: eyMap.get(cat)?.avgReality ?? 0,
          eyCount: eyMap.get(cat)?.count ?? 0,
          competitorAvgScore: othersMap.get(cat)?.avgReality ?? 0,
          competitorCount: othersMap.get(cat)?.count ?? 0,
        }));

        return { categories };
      },
      ["ai-positioning-ey-comparison"],
      [CACHE_TAGS.aiPositioning]
    );
  }),
});

export type AiPositioningRouter = typeof aiPositioningRouter;
