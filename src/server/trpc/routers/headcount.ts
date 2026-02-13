import { z } from "zod";
import { revalidateTag } from "next/cache";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "@/server/db";
import { CACHE_TAGS } from "@/server/cache";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const getComparisonInputSchema = z.object({
  competitorIds: z.array(z.string()).optional(),
});

const getTrendsInputSchema = z.object({
  competitorIds: z.array(z.string()).optional(),
});

const uploadInputSchema = z.object({
  competitorId: z.string().min(1),
  snapshotDate: z.date(),
  dataSource: z.string().default("Manual CSV Upload"),
  totalSustainabilityHeadcount: z.number().int().nullable().optional(),
  usHeadcount: z.number().int().nullable().optional(),
  ukHeadcount: z.number().int().nullable().optional(),
  euHeadcount: z.number().int().nullable().optional(),
  indiaHeadcount: z.number().int().nullable().optional(),
  apacHeadcount: z.number().int().nullable().optional(),
  otherHeadcount: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  confidenceLevel: z.string().nullable().optional(),
});

const bulkUploadInputSchema = z.object({
  rows: z.array(uploadInputSchema),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const headcountRouter = createTRPCRouter({
  /**
   * getComparison – latest headcount snapshot per competitor for bar charts
   */
  getComparison: protectedProcedure.input(getComparisonInputSchema).query(async ({ input }) => {
    const competitorFilter = input.competitorIds && input.competitorIds.length > 0
      ? { id: { in: input.competitorIds } }
      : {};

    const competitors = await db.competitor.findMany({
      where: { isActive: true, ...competitorFilter },
      select: { id: true, name: true, slug: true, shortName: true, brandColor: true },
      orderBy: { name: "asc" },
    });

    const results = await Promise.all(
      competitors.map(async (comp) => {
        const latest = await db.headcountSnapshot.findFirst({
          where: { competitorId: comp.id },
          orderBy: { snapshotDate: "desc" },
        });

        return {
          ...comp,
          snapshot: latest
            ? {
                snapshotDate: latest.snapshotDate,
                dataSource: latest.dataSource,
                total: latest.totalSustainabilityHeadcount ?? 0,
                us: latest.usHeadcount ?? 0,
                uk: latest.ukHeadcount ?? 0,
                eu: latest.euHeadcount ?? 0,
                india: latest.indiaHeadcount ?? 0,
                apac: latest.apacHeadcount ?? 0,
                other: latest.otherHeadcount ?? 0,
                pctChange: latest.pctChangeVsPrior,
                confidenceLevel: latest.confidenceLevel,
                notes: latest.notes,
              }
            : null,
        };
      })
    );

    return results.sort((a, b) => (b.snapshot?.total ?? 0) - (a.snapshot?.total ?? 0));
  }),

  /**
   * getTrends – headcount over time per competitor
   */
  getTrends: protectedProcedure.input(getTrendsInputSchema).query(async ({ input }) => {
    const competitorFilter = input.competitorIds && input.competitorIds.length > 0
      ? { competitorId: { in: input.competitorIds } }
      : {};

    const snapshots = await db.headcountSnapshot.findMany({
      where: competitorFilter,
      select: {
        competitorId: true,
        snapshotDate: true,
        totalSustainabilityHeadcount: true,
        competitor: {
          select: { name: true, slug: true, brandColor: true },
        },
      },
      orderBy: { snapshotDate: "asc" },
    });

    // Group by date key → competitor slug → value
    const competitorSlugs = new Map<string, { name: string; brandColor: string | null }>();
    const dateBuckets = new Map<string, Record<string, number>>();

    for (const snap of snapshots) {
      const key = `${snap.snapshotDate.getFullYear()}-${String(snap.snapshotDate.getMonth() + 1).padStart(2, "0")}`;
      const slug = snap.competitor.slug;
      const value = snap.totalSustainabilityHeadcount ?? 0;

      if (!dateBuckets.has(key)) dateBuckets.set(key, {});
      dateBuckets.get(key)![slug] = value;

      if (!competitorSlugs.has(slug)) {
        competitorSlugs.set(slug, {
          name: snap.competitor.name,
          brandColor: snap.competitor.brandColor,
        });
      }
    }

    const trends = Array.from(dateBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => {
        const row: { date: string; [key: string]: string | number } = { date };
        for (const slug of competitorSlugs.keys()) {
          row[slug] = counts[slug] ?? 0;
        }
        return row;
      });

    const competitors = Array.from(competitorSlugs.entries()).map(([slug, info]) => ({
      slug,
      name: info.name,
      brandColor: info.brandColor,
    }));

    return { trends, competitors };
  }),

  /**
   * getRegionalBreakdown – regional headcount for a single competitor
   */
  getRegionalBreakdown: protectedProcedure
    .input(z.object({ competitorId: z.string().min(1) }))
    .query(async ({ input }) => {
      const latest = await db.headcountSnapshot.findFirst({
        where: { competitorId: input.competitorId },
        orderBy: { snapshotDate: "desc" },
        include: {
          competitor: {
            select: { name: true, slug: true, brandColor: true },
          },
        },
      });

      if (!latest) return null;

      return {
        competitor: latest.competitor,
        snapshotDate: latest.snapshotDate,
        regions: [
          { region: "US", headcount: latest.usHeadcount ?? 0 },
          { region: "UK", headcount: latest.ukHeadcount ?? 0 },
          { region: "EU", headcount: latest.euHeadcount ?? 0 },
          { region: "India", headcount: latest.indiaHeadcount ?? 0 },
          { region: "APAC", headcount: latest.apacHeadcount ?? 0 },
          { region: "Other", headcount: latest.otherHeadcount ?? 0 },
        ].filter((r) => r.headcount > 0),
        total: latest.totalSustainabilityHeadcount ?? 0,
      };
    }),

  /**
   * upload – single headcount snapshot (manual entry)
   */
  upload: protectedProcedure.input(uploadInputSchema).mutation(async ({ input }) => {
    const { competitorId, snapshotDate, dataSource, ...data } = input;

    const snapshot = await db.headcountSnapshot.upsert({
      where: {
        competitorId_snapshotDate_dataSource: {
          competitorId,
          snapshotDate,
          dataSource,
        },
      },
      create: {
        competitorId,
        snapshotDate,
        dataSource,
        ...data,
      },
      update: data,
    });

    // Invalidate dashboard caches
    revalidateTag(CACHE_TAGS.headcount, "max");
    revalidateTag(CACHE_TAGS.dashboard, "max");

    return snapshot;
  }),

  /**
   * bulkUpload – multiple headcount snapshots from CSV
   */
  bulkUpload: protectedProcedure.input(bulkUploadInputSchema).mutation(async ({ input }) => {
    const results = await Promise.all(
      input.rows.map(async (row) => {
        const { competitorId, snapshotDate, dataSource, ...data } = row;

        return db.headcountSnapshot.upsert({
          where: {
            competitorId_snapshotDate_dataSource: {
              competitorId,
              snapshotDate,
              dataSource,
            },
          },
          create: {
            competitorId,
            snapshotDate,
            dataSource,
            ...data,
          },
          update: data,
        });
      })
    );

    // Invalidate dashboard caches
    revalidateTag(CACHE_TAGS.headcount, "max");
    revalidateTag(CACHE_TAGS.dashboard, "max");

    return { uploaded: results.length };
  }),
});
