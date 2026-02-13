import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const listInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  geographies: z.array(z.string()).optional(),
  impactLevels: z.array(z.string()).optional(),
  directionsOfChange: z.array(z.string()).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["publishedAt", "title", "geography", "impactLevel", "directionOfChange", "createdAt"])
    .default("publishedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const getByIdInputSchema = z.object({
  id: z.string().min(1),
});

const getStatsInputSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDateFilter(dateFrom?: Date, dateTo?: Date): Prisma.RegulatoryEventWhereInput {
  if (!dateFrom && !dateTo) return {};
  const publishedAt: Prisma.DateTimeNullableFilter = {};
  if (dateFrom) publishedAt.gte = dateFrom;
  if (dateTo) publishedAt.lte = dateTo;
  return { publishedAt };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const regulatoryRouter = createTRPCRouter({
  /**
   * list – paginated list with filters
   */
  list: protectedProcedure.input(listInputSchema).query(async ({ input }) => {
    const {
      page,
      limit,
      geographies,
      impactLevels,
      directionsOfChange,
      dateFrom,
      dateTo,
      search,
      sortBy,
      sortOrder,
    } = input;

    const where: Prisma.RegulatoryEventWhereInput = {
      ...buildDateFilter(dateFrom, dateTo),
      ...(geographies && geographies.length > 0 ? { geography: { in: geographies } } : {}),
      ...(impactLevels && impactLevels.length > 0 ? { impactLevel: { in: impactLevels } } : {}),
      ...(directionsOfChange && directionsOfChange.length > 0
        ? { directionOfChange: { in: directionsOfChange } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { aiSummary: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.regulatoryEvent.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.regulatoryEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }),

  /**
   * getById – single regulatory event detail
   */
  getById: protectedProcedure.input(getByIdInputSchema).query(async ({ input }) => {
    const event = await db.regulatoryEvent.findUnique({
      where: { id: input.id },
    });

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Regulatory event with id "${input.id}" not found.`,
      });
    }

    return event;
  }),

  /**
   * getStats – aggregation stats for the regulatory module
   */
  getStats: protectedProcedure.input(getStatsInputSchema).query(async ({ input }) => {
    const dateFilter = buildDateFilter(input.dateFrom, input.dateTo);

    const [total, byGeographyRaw, byImpactRaw, byDirectionRaw, highImpact] = await Promise.all([
      db.regulatoryEvent.count({ where: dateFilter }),
      db.regulatoryEvent.groupBy({
        by: ["geography"],
        where: { ...dateFilter, geography: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      db.regulatoryEvent.groupBy({
        by: ["impactLevel"],
        where: { ...dateFilter, impactLevel: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      db.regulatoryEvent.groupBy({
        by: ["directionOfChange"],
        where: { ...dateFilter, directionOfChange: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      db.regulatoryEvent.count({
        where: { ...dateFilter, impactLevel: "High" },
      }),
    ]);

    return {
      total,
      highImpact,
      byGeography: byGeographyRaw.map((r) => ({
        geography: r.geography ?? "Unknown",
        count: r._count.id,
      })),
      byImpact: byImpactRaw.map((r) => ({
        impactLevel: r.impactLevel ?? "Unknown",
        count: r._count.id,
      })),
      byDirection: byDirectionRaw.map((r) => ({
        direction: r.directionOfChange ?? "Unknown",
        count: r._count.id,
      })),
    };
  }),

  /**
   * getTimeline – regulatory events over time grouped by month
   */
  getTimeline: protectedProcedure
    .input(z.object({ months: z.number().int().min(1).max(24).default(12) }))
    .query(async ({ input }) => {
      const now = new Date();
      const dateFrom = new Date(now.getFullYear(), now.getMonth() - input.months + 1, 1);

      const events = await db.regulatoryEvent.findMany({
        where: { publishedAt: { gte: dateFrom } },
        select: {
          publishedAt: true,
          impactLevel: true,
          geography: true,
        },
        orderBy: { publishedAt: "asc" },
      });

      // Build month buckets
      const monthBuckets = new Map<string, { high: number; medium: number; low: number; total: number }>();

      for (let i = 0; i < input.months; i++) {
        const d = new Date(dateFrom.getFullYear(), dateFrom.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthBuckets.set(key, { high: 0, medium: 0, low: 0, total: 0 });
      }

      for (const evt of events) {
        if (!evt.publishedAt) continue;
        const d = evt.publishedAt;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = monthBuckets.get(key);
        if (!bucket) continue;

        bucket.total += 1;
        if (evt.impactLevel === "High") bucket.high += 1;
        else if (evt.impactLevel === "Medium") bucket.medium += 1;
        else bucket.low += 1;
      }

      return Array.from(monthBuckets.entries()).map(([month, counts]) => ({
        month,
        ...counts,
      }));
    }),
});
