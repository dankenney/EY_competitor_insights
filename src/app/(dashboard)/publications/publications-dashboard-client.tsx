"use client";

import { useState, useMemo } from "react";
import { subMonths, startOfMonth } from "date-fns";
import { trpc } from "@/lib/trpc";

import {
  PublicationStats,
  type PublicationStatsData,
} from "@/components/modules/publications/publication-stats";
import {
  PublicationTrendChart,
} from "@/components/modules/publications/publication-trend-chart";
import {
  ThemeHeatmap,
} from "@/components/modules/publications/theme-heatmap";
import {
  PublicationsTable,
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

  // ----- Live tRPC queries -----
  const statsQuery = trpc.publications.getStats.useQuery({ dateFrom, dateTo });
  const trendsQuery = trpc.publications.getTrends.useQuery({
    months: datePreset === "3m" ? 3 : datePreset === "6m" ? 6 : 12,
  });
  const themeQuery = trpc.publications.getThemeDistribution.useQuery({ dateFrom, dateTo });
  const listQuery = trpc.publications.list.useQuery({ page: 1, limit: 50, dateFrom, dateTo });

  // ----- Derived data -----
  const statsData: PublicationStatsData | null = statsQuery.data
    ? {
        total: statsQuery.data.total,
        byCompetitor: statsQuery.data.byCompetitor,
        byTheme: statsQuery.data.byTheme,
        classified: statsQuery.data.classified,
        unclassified: statsQuery.data.unclassified,
        thisMonthCount: 0,
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
