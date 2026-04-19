import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/server/db";
import { cachedQuery, CACHE_TAGS } from "@/server/cache";

export const dashboardRouter = router({
  /**
   * overview – top-level stats across all modules for the main dashboard.
   * Cached for 5 minutes — data only updates every 6-24h via BullMQ.
   */
  overview: protectedProcedure.query(async () => {
    return cachedQuery(
      async () => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
          competitorCount,
          publicationsTotal,
          publicationsThisMonth,
          regulatoryTotal,
          regulatoryHighImpact,
          layoffEventsRecent,
          aiPositioningSignals,
          lastScraperRun,
        ] = await Promise.all([
          db.competitor.count({ where: { isActive: true } }),
          db.publication.count(),
          db.publication.count({
            where: { publishedDate: { gte: thirtyDaysAgo } },
          }),
          db.regulatoryEvent.count(),
          db.regulatoryEvent.count({ where: { impactLevel: "High" } }),
          db.layoffEvent.count({
            where: { eventDate: { gte: thirtyDaysAgo } },
          }),
          db.aiPositioningSignal.count(),
          db.scraperRun.findFirst({
            orderBy: { completedAt: "desc" },
            select: { completedAt: true, status: true },
          }),
        ]);

        return {
          competitorCount,
          publicationsTotal,
          publicationsThisMonth,
          regulatoryTotal,
          regulatoryHighImpact,
          layoffEventsRecent,
          aiPositioningSignals,
          lastDataRefresh: lastScraperRun?.completedAt ?? null,
          scraperStatus: lastScraperRun?.status ?? null,
        };
      },
      ["dashboard-overview"],
      [CACHE_TAGS.dashboard, CACHE_TAGS.publications, CACHE_TAGS.regulatory, CACHE_TAGS.talentSignals, CACHE_TAGS.aiPositioning]
    );
  }),

  /**
   * competitorSummary – per-competitor intelligence snapshot.
   * Cached for 5 minutes.
   */
  competitorSummary: protectedProcedure.query(async () => {
    return cachedQuery(
      async () => {
        const competitors = await db.competitor.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            shortName: true,
            category: true,
            brandColor: true,
          },
        });

        const results = await Promise.all(
          competitors.map(async (comp) => {
            const [pubCount, latestHeadcount, recentEvents] = await Promise.all([
              db.publication.count({ where: { competitorId: comp.id } }),
              db.headcountSnapshot.findFirst({
                where: { competitorId: comp.id },
                orderBy: { snapshotDate: "desc" },
                select: {
                  totalSustainabilityHeadcount: true,
                  pctChangeVsPrior: true,
                  snapshotDate: true,
                },
              }),
              db.layoffEvent.findMany({
                where: { competitorId: comp.id },
                orderBy: { eventDate: "desc" },
                take: 1,
                select: {
                  eventType: true,
                  headcountAffected: true,
                  eventDate: true,
                  aiSummary: true,
                },
              }),
            ]);

            return {
              ...comp,
              publicationCount: pubCount,
              headcount: latestHeadcount?.totalSustainabilityHeadcount ?? null,
              headcountChange: latestHeadcount?.pctChangeVsPrior ?? null,
              latestEvent: recentEvents[0] ?? null,
            };
          })
        );

        return results;
      },
      ["dashboard-competitor-summary"],
      [CACHE_TAGS.dashboard, CACHE_TAGS.competitors, CACHE_TAGS.publications, CACHE_TAGS.headcount, CACHE_TAGS.talentSignals]
    );
  }),

  /**
   * recentActivity – latest signals across all modules (unified feed).
   * Cached for 5 minutes.
   */
  recentActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      return cachedQuery(
        async () => {
          const [publications, regulatory, layoffEvents] = await Promise.all([
            db.publication.findMany({
              orderBy: { publishedDate: "desc" },
              take: input.limit,
              select: {
                id: true,
                title: true,
                publishedDate: true,
                primaryTheme: true,
                contentType: true,
                url: true,
                competitor: {
                  select: { name: true, slug: true, brandColor: true },
                },
              },
            }),
            db.regulatoryEvent.findMany({
              orderBy: { publishedAt: "desc" },
              take: input.limit,
              select: {
                id: true,
                title: true,
                publishedAt: true,
                geography: true,
                impactLevel: true,
                directionOfChange: true,
                aiSummary: true,
                sourceUrl: true,
              },
            }),
            db.layoffEvent.findMany({
              orderBy: { eventDate: "desc" },
              take: input.limit,
              select: {
                id: true,
                company: true,
                eventType: true,
                eventDate: true,
                headcountAffected: true,
                division: true,
                geography: true,
                aiSummary: true,
                competitor: {
                  select: { name: true, slug: true, brandColor: true },
                },
              },
            }),
          ]);

          // Merge into a unified feed sorted by date
          type ActivityItem = {
            id: string;
            type: "publication" | "regulatory" | "talent";
            title: string;
            date: Date | null;
            competitor: string | null;
            competitorSlug: string | null;
            brandColor: string | null;
            summary: string | null;
            metadata: Record<string, unknown>;
          };

          const items: ActivityItem[] = [
            ...publications.map((p) => ({
              id: p.id,
              type: "publication" as const,
              title: p.title,
              date: p.publishedDate,
              competitor: p.competitor.name,
              competitorSlug: p.competitor.slug,
              brandColor: p.competitor.brandColor,
              summary: null,
              metadata: {
                theme: p.primaryTheme,
                contentType: p.contentType,
                url: p.url,
              },
            })),
            ...regulatory.map((r) => ({
              id: r.id,
              type: "regulatory" as const,
              title: r.title,
              date: r.publishedAt,
              competitor: null,
              competitorSlug: null,
              brandColor: null,
              summary: r.aiSummary,
              metadata: {
                geography: r.geography,
                impactLevel: r.impactLevel,
                directionOfChange: r.directionOfChange,
                sourceUrl: r.sourceUrl,
              },
            })),
            ...layoffEvents.map((e) => ({
              id: e.id,
              type: "talent" as const,
              title: `${e.company}: ${e.eventType}${e.division ? ` — ${e.division}` : ""}`,
              date: e.eventDate,
              competitor: e.competitor?.name ?? e.company,
              competitorSlug: e.competitor?.slug ?? null,
              brandColor: e.competitor?.brandColor ?? null,
              summary: e.aiSummary,
              metadata: {
                eventType: e.eventType,
                headcountAffected: e.headcountAffected,
                geography: e.geography,
              },
            })),
          ];

          items.sort((a, b) => {
            const da = a.date?.getTime() ?? 0;
            const db2 = b.date?.getTime() ?? 0;
            return db2 - da;
          });

          return items.slice(0, input.limit);
        },
        [`dashboard-recent-activity-${input.limit}`],
        [CACHE_TAGS.dashboard, CACHE_TAGS.publications, CACHE_TAGS.regulatory, CACHE_TAGS.talentSignals]
      );
    }),

  /**
   * headcountComparison – latest headcount across all competitors for bar chart.
   * Cached for 5 minutes.
   */
  headcountComparison: protectedProcedure.query(async () => {
    return cachedQuery(
      async () => {
        const competitors = await db.competitor.findMany({
          where: { isActive: true },
          select: { id: true, name: true, slug: true, brandColor: true },
        });

        const results = await Promise.all(
          competitors.map(async (comp) => {
            // Fetch two most recent snapshots so we can compute pctChange
            // even when the stored value is null
            const snapshots = await db.headcountSnapshot.findMany({
              where: { competitorId: comp.id },
              orderBy: { snapshotDate: "desc" },
              take: 2,
              select: {
                totalSustainabilityHeadcount: true,
                usHeadcount: true,
                ukHeadcount: true,
                euHeadcount: true,
                indiaHeadcount: true,
                apacHeadcount: true,
                pctChangeVsPrior: true,
              },
            });

            const latest = snapshots[0] ?? null;
            const prior = snapshots[1] ?? null;

            // Use stored pctChange if available, otherwise compute from
            // the two most recent snapshots
            let pctChange = latest?.pctChangeVsPrior ?? null;
            if (
              pctChange === null &&
              latest?.totalSustainabilityHeadcount &&
              prior?.totalSustainabilityHeadcount &&
              prior.totalSustainabilityHeadcount > 0
            ) {
              pctChange =
                Math.round(
                  ((latest.totalSustainabilityHeadcount -
                    prior.totalSustainabilityHeadcount) /
                    prior.totalSustainabilityHeadcount) *
                    10000
                ) / 100;
            }

            return {
              name: comp.name,
              slug: comp.slug,
              brandColor: comp.brandColor,
              total: latest?.totalSustainabilityHeadcount ?? 0,
              us: latest?.usHeadcount ?? 0,
              uk: latest?.ukHeadcount ?? 0,
              eu: latest?.euHeadcount ?? 0,
              india: latest?.indiaHeadcount ?? 0,
              apac: latest?.apacHeadcount ?? 0,
              pctChange,
            };
          })
        );

        return results
          .filter((r) => r.total > 0)
          .sort((a, b) => b.total - a.total);
      },
      ["dashboard-headcount-comparison"],
      [CACHE_TAGS.dashboard, CACHE_TAGS.headcount, CACHE_TAGS.competitors]
    );
  }),

  /**
   * regulatoryOverview – regulatory events summary for dashboard.
   * Cached for 5 minutes.
   */
  regulatoryOverview: protectedProcedure.query(async () => {
    return cachedQuery(
      async () => {
        const [events, byGeography, byImpact] = await Promise.all([
          db.regulatoryEvent.findMany({
            orderBy: { publishedAt: "desc" },
            take: 10,
            select: {
              id: true,
              title: true,
              geography: true,
              impactLevel: true,
              directionOfChange: true,
              aiSummary: true,
              aiRelevanceToCcass: true,
              publishedAt: true,
              frameworksAffected: true,
            },
          }),
          db.regulatoryEvent.groupBy({
            by: ["geography"],
            where: { geography: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
          }),
          db.regulatoryEvent.groupBy({
            by: ["impactLevel"],
            where: { impactLevel: { not: null } },
            _count: { id: true },
          }),
        ]);

        return {
          events,
          byGeography: byGeography.map((g) => ({
            geography: g.geography ?? "Unknown",
            count: g._count.id,
          })),
          byImpact: byImpact.map((i) => ({
            impactLevel: i.impactLevel ?? "Unknown",
            count: i._count.id,
          })),
        };
      },
      ["dashboard-regulatory-overview"],
      [CACHE_TAGS.dashboard, CACHE_TAGS.regulatory]
    );
  }),
});
