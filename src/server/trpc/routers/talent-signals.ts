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
  limit: z.number().int().min(1).max(100).default(50),
  competitorIds: z.array(z.string()).optional(),
  eventTypes: z.array(z.string()).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["eventDate", "company", "eventType", "headcountAffected", "createdAt"])
    .default("eventDate"),
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

function buildDateFilter(dateFrom?: Date, dateTo?: Date): Prisma.LayoffEventWhereInput {
  if (!dateFrom && !dateTo) return {};
  const eventDate: Prisma.DateTimeNullableFilter = {};
  if (dateFrom) eventDate.gte = dateFrom;
  if (dateTo) eventDate.lte = dateTo;
  return { eventDate };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const talentSignalsRouter = createTRPCRouter({
  /**
   * list – paginated list with filters
   */
  list: protectedProcedure.input(listInputSchema).query(async ({ input }) => {
    const {
      page,
      limit,
      competitorIds,
      eventTypes,
      dateFrom,
      dateTo,
      search,
      sortBy,
      sortOrder,
    } = input;

    const where: Prisma.LayoffEventWhereInput = {
      ...buildDateFilter(dateFrom, dateTo),
      ...(competitorIds && competitorIds.length > 0 ? { competitorId: { in: competitorIds } } : {}),
      ...(eventTypes && eventTypes.length > 0 ? { eventType: { in: eventTypes } } : {}),
      ...(search
        ? {
            OR: [
              { company: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { aiSummary: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { division: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.layoffEvent.findMany({
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
      db.layoffEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }),

  /**
   * getById – single event detail
   */
  getById: protectedProcedure.input(getByIdInputSchema).query(async ({ input }) => {
    const event = await db.layoffEvent.findUnique({
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

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Talent signal event with id "${input.id}" not found.`,
      });
    }

    return event;
  }),

  /**
   * getStats – aggregation stats for talent signals
   */
  getStats: protectedProcedure.input(getStatsInputSchema).query(async ({ input }) => {
    const dateFilter = buildDateFilter(input.dateFrom, input.dateTo);

    const [total, byEventTypeRaw, byCompetitorRaw, byGeographyRaw, totalAffected] = await Promise.all([
      db.layoffEvent.count({ where: dateFilter }),
      db.layoffEvent.groupBy({
        by: ["eventType"],
        where: { ...dateFilter, eventType: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      db.layoffEvent.groupBy({
        by: ["competitorId"],
        where: { ...dateFilter, competitorId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      db.layoffEvent.groupBy({
        by: ["geography"],
        where: { ...dateFilter, geography: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      db.layoffEvent.aggregate({
        where: dateFilter,
        _sum: { headcountAffected: true },
      }),
    ]);

    // Hydrate competitor names
    const competitorIds = byCompetitorRaw
      .map((r) => r.competitorId)
      .filter((id): id is string => id !== null);
    const competitors = await db.competitor.findMany({
      where: { id: { in: competitorIds } },
      select: { id: true, name: true, slug: true, brandColor: true },
    });
    const competitorMap = new Map(competitors.map((c) => [c.id, c]));

    return {
      total,
      totalAffected: totalAffected._sum.headcountAffected ?? 0,
      byEventType: byEventTypeRaw.map((r) => ({
        eventType: r.eventType ?? "Unknown",
        count: r._count.id,
      })),
      byCompetitor: byCompetitorRaw.map((r) => {
        const comp = r.competitorId ? competitorMap.get(r.competitorId) : null;
        return {
          competitorId: r.competitorId,
          competitorName: comp?.name ?? "Unknown",
          slug: comp?.slug ?? "unknown",
          brandColor: comp?.brandColor ?? "#888888",
          count: r._count.id,
        };
      }),
      byGeography: byGeographyRaw.map((r) => ({
        geography: r.geography ?? "Unknown",
        count: r._count.id,
      })),
    };
  }),

  /**
   * getTimeline – events over time for timeline visualization
   */
  getTimeline: protectedProcedure
    .input(z.object({ months: z.number().int().min(1).max(24).default(12) }))
    .query(async ({ input }) => {
      const now = new Date();
      const dateFrom = new Date(now.getFullYear(), now.getMonth() - input.months + 1, 1);

      const events = await db.layoffEvent.findMany({
        where: { eventDate: { gte: dateFrom } },
        include: {
          competitor: {
            select: { name: true, slug: true, brandColor: true },
          },
        },
        orderBy: { eventDate: "desc" },
      });

      return events;
    }),

  /**
   * getEventTypes – distinct event types for filter dropdowns
   */
  getEventTypes: protectedProcedure.query(async () => {
    const types = await db.layoffEvent.groupBy({
      by: ["eventType"],
      where: { eventType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    return types.map((t) => ({
      type: t.eventType ?? "Unknown",
      count: t._count.id,
    }));
  }),
});
