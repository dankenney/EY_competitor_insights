"use client";

import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_COLOR_FALLBACK } from "@/lib/constants";

const CATEGORY_LABELS: Record<string, string> = {
  SELF: "EY",
  BIG4: "Big 4",
  MBB: "MBB",
  ENGINEERING: "Engineering",
};

export function CompetitorsClient() {
  const competitors = trpc.dashboard.competitorSummary.useQuery();
  const headcount = trpc.dashboard.headcountComparison.useQuery();

  // Group competitors by category
  const grouped = competitors.data?.reduce(
    (acc, comp) => {
      const cat = comp.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(comp);
      return acc;
    },
    {} as Record<string, typeof competitors.data>
  );

  const categoryOrder = ["SELF", "BIG4", "MBB", "ENGINEERING"];

  return (
    <div className="space-y-8">
      {/* Headcount comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Sustainability Headcount Comparison</CardTitle>
          <CardDescription>
            Latest estimated sustainability team sizes with geographic breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {headcount.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : headcount.data && headcount.data.length > 0 ? (
            <div className="space-y-3">
              {headcount.data.map((comp) => {
                const maxTotal = Math.max(
                  ...headcount.data!.map((c) => c.total)
                );
                const pct = (comp.total / maxTotal) * 100;
                return (
                  <div key={comp.slug} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium truncate">
                      {comp.name}
                    </div>
                    <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: comp.brandColor ?? BRAND_COLOR_FALLBACK,
                          opacity: 0.8,
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                        {comp.total.toLocaleString()}
                      </span>
                    </div>
                    {comp.pctChange !== null && (
                      <div
                        className={cn(
                          "flex items-center gap-0.5 text-xs font-medium w-16",
                          comp.pctChange > 0
                            ? "text-emerald-600"
                            : comp.pctChange < 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                        )}
                      >
                        {comp.pctChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : comp.pctChange < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : null}
                        {comp.pctChange > 0 ? "+" : ""}
                        {comp.pctChange.toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No headcount data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Competitor cards grouped by category */}
      {competitors.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : grouped ? (
        categoryOrder
          .filter((cat) => grouped[cat]?.length)
          .map((cat) => (
            <div key={cat}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {CATEGORY_LABELS[cat] ?? cat}
                <Badge variant="secondary" className="text-xs">
                  {grouped[cat]!.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {grouped[cat]!.map((comp) => (
                  <Card
                    key={comp.id}
                    className="group relative transition-shadow hover:shadow-md"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: comp.brandColor ?? BRAND_COLOR_FALLBACK,
                          }}
                        />
                        <span className="font-semibold text-sm truncate">
                          {comp.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="ml-auto text-xs shrink-0"
                        >
                          {CATEGORY_LABELS[comp.category] ?? comp.category}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Publications
                          </span>
                          <span className="font-medium">
                            {comp.publicationCount}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Headcount
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">
                              {comp.headcount
                                ? comp.headcount.toLocaleString()
                                : "--"}
                            </span>
                            {comp.headcountChange !== null && (
                              <span
                                className={cn(
                                  "text-xs",
                                  comp.headcountChange > 0
                                    ? "text-emerald-600"
                                    : comp.headcountChange < 0
                                      ? "text-red-500"
                                      : "text-muted-foreground"
                                )}
                              >
                                {comp.headcountChange > 0 ? "+" : ""}
                                {comp.headcountChange.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {comp.latestEvent && (
                        <div className="pt-2 border-t mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            {comp.latestEvent.eventType}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {comp.latestEvent.aiSummary}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
      ) : (
        <p className="text-sm text-muted-foreground">
          No competitor data available
        </p>
      )}
    </div>
  );
}
