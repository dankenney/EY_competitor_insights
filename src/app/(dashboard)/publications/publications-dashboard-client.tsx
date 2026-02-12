"use client";

import { useState, useMemo } from "react";
import { subMonths, startOfMonth } from "date-fns";

import {
  PublicationStats,
  type PublicationStatsData,
} from "@/components/modules/publications/publication-stats";
import {
  PublicationTrendChart,
  type TrendDataPoint,
} from "@/components/modules/publications/publication-trend-chart";
import {
  ThemeHeatmap,
  type CompetitorThemeData,
} from "@/components/modules/publications/theme-heatmap";
import {
  PublicationsTable,
  type PublicationRow,
} from "@/components/modules/publications/publications-table";
import {
  CardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Calendar } from "lucide-react";

// ---------------------------------------------------------------------------
// NOTE: This component is designed to work with tRPC hooks once the full
// tRPC client is wired up. In the interim, it demonstrates the intended
// data flow with placeholder hooks and loading/empty states.
//
// Once tRPC is connected, replace the placeholder hooks below with:
//   import { trpc } from "@/lib/trpc/client";
//   const stats = trpc.publications.getStats.useQuery({ dateFrom, dateTo });
//   const trends = trpc.publications.getTrends.useQuery({ months: 12 });
//   const themeDistribution = trpc.publications.getThemeDistribution.useQuery({ dateFrom, dateTo });
//   const list = trpc.publications.list.useQuery({ page, limit: 50 });
// ---------------------------------------------------------------------------

// Placeholder hook types that mirror the tRPC query shape
interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: { message: string } | null;
}

/**
 * Stub hook - returns loading state to allow the full UI skeleton to render.
 * Replace with actual tRPC calls when the client is wired.
 */
function usePlaceholder<T>(): QueryResult<T> {
  return { data: undefined, isLoading: true, isError: false, error: null };
}

// ---------------------------------------------------------------------------
// Date range presets
// ---------------------------------------------------------------------------

type DatePreset = "3m" | "6m" | "12m" | "all";

function getDateRange(preset: DatePreset): { dateFrom: Date | undefined; dateTo: Date | undefined } {
  const now = new Date();
  switch (preset) {
    case "3m":
      return { dateFrom: startOfMonth(subMonths(now, 3)), dateTo: now };
    case "6m":
      return { dateFrom: startOfMonth(subMonths(now, 6)), dateTo: now };
    case "12m":
      return { dateFrom: startOfMonth(subMonths(now, 12)), dateTo: now };
    case "all":
    default:
      return { dateFrom: undefined, dateTo: undefined };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicationsDashboardClient() {
  const [datePreset, setDatePreset] = useState<DatePreset>("12m");
  const { dateFrom, dateTo } = useMemo(() => getDateRange(datePreset), [datePreset]);

  // ----- tRPC queries (stubs) -----
  // Replace usePlaceholder with actual tRPC hooks when available:
  //   const statsQuery = trpc.publications.getStats.useQuery({ dateFrom, dateTo });
  const statsQuery = usePlaceholder<{
    total: number;
    byCompetitor: { competitorId: string; competitorName: string; slug: string; brandColor: string; count: number }[];
    byTheme: { theme: string; count: number }[];
    byContentType: { contentType: string; count: number }[];
    classified: number;
    unclassified: number;
  }>();

  const trendsQuery = usePlaceholder<{
    trends: TrendDataPoint[];
    competitors: { slug: string; name: string; brandColor: string | null }[];
  }>();

  const themeQuery = usePlaceholder<CompetitorThemeData[]>();

  const listQuery = usePlaceholder<{
    items: PublicationRow[];
    total: number;
    page: number;
    totalPages: number;
  }>();

  // ----- Derived data -----
  const statsData: PublicationStatsData | null = statsQuery.data
    ? {
        total: statsQuery.data.total,
        byCompetitor: statsQuery.data.byCompetitor,
        byTheme: statsQuery.data.byTheme,
        classified: statsQuery.data.classified,
        unclassified: statsQuery.data.unclassified,
        thisMonthCount: 0, // Could be computed from trends data
      }
    : null;

  const competitors = useMemo(() => {
    if (statsQuery.data?.byCompetitor) {
      return statsQuery.data.byCompetitor.map((c) => ({
        name: c.competitorName,
        slug: c.slug,
        brandColor: c.brandColor,
      }));
    }
    return [];
  }, [statsQuery.data]);

  // ----- Render -----
  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Period:</span>
        <div className="flex gap-1">
          {(
            [
              { value: "3m", label: "3 months" },
              { value: "6m", label: "6 months" },
              { value: "12m", label: "12 months" },
              { value: "all", label: "All time" },
            ] as const
          ).map((preset) => (
            <Button
              key={preset.value}
              variant={datePreset === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => setDatePreset(preset.value)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      {statsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : statsData ? (
        <PublicationStats data={statsData} />
      ) : null}

      {/* Tabs for chart views */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="themes">Theme Distribution</TabsTrigger>
        </TabsList>

        {/* Trend chart tab */}
        <TabsContent value="trends">
          {trendsQuery.isLoading ? (
            <ChartSkeleton />
          ) : trendsQuery.data ? (
            <PublicationTrendChart
              data={trendsQuery.data.trends}
              competitors={trendsQuery.data.competitors}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No trend data"
              description="Publication trend data will appear here once publications have been ingested."
            />
          )}
        </TabsContent>

        {/* Theme heatmap tab */}
        <TabsContent value="themes">
          {themeQuery.isLoading ? (
            <ChartSkeleton />
          ) : themeQuery.data && themeQuery.data.length > 0 ? (
            <ThemeHeatmap data={themeQuery.data} />
          ) : (
            <EmptyState
              icon={FileText}
              title="No theme data"
              description="Theme distribution data will appear here once publications have been classified."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Publications table */}
      {listQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : listQuery.data && listQuery.data.items.length > 0 ? (
        <PublicationsTable
          data={listQuery.data.items}
          competitors={competitors}
        />
      ) : (
        <EmptyState
          icon={FileText}
          title="No publications yet"
          description="Publications will appear here once they have been scraped from competitor websites."
        />
      )}
    </div>
  );
}
