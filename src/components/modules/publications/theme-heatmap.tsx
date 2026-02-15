"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PUBLICATION_THEMES, BRAND_COLOR_FALLBACK } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThemeCount {
  theme: string;
  count: number;
}

export interface CompetitorThemeData {
  competitorName: string;
  slug: string;
  brandColor: string | null;
  themes: ThemeCount[];
}

export interface ThemeHeatmapProps {
  data: CompetitorThemeData[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns background + text color classes based on intensity (0-1).
 * Uses a green scale to avoid clashing with brand colors.
 */
function getIntensityStyle(
  value: number,
  maxValue: number
): { backgroundColor: string; color: string } {
  if (value === 0 || maxValue === 0) {
    return { backgroundColor: "transparent", color: "inherit" };
  }

  const intensity = value / maxValue;

  if (intensity < 0.2) {
    return { backgroundColor: "rgba(34, 197, 94, 0.10)", color: "inherit" };
  }
  if (intensity < 0.4) {
    return { backgroundColor: "rgba(34, 197, 94, 0.20)", color: "inherit" };
  }
  if (intensity < 0.6) {
    return { backgroundColor: "rgba(34, 197, 94, 0.35)", color: "inherit" };
  }
  if (intensity < 0.8) {
    return { backgroundColor: "rgba(34, 197, 94, 0.55)", color: "#fff" };
  }
  return { backgroundColor: "rgba(22, 163, 74, 0.80)", color: "#fff" };
}

// Shortened theme labels for narrow columns
function shortenTheme(theme: string): string {
  const map: Record<string, string> = {
    "Climate change and biodiversity": "Climate & Bio",
    "ESG reporting and regulations": "ESG Report",
    "ESG Managed Services": "ESG Services",
    "Sustainable finance": "Sust. Finance",
    "Climate tech": "Climate Tech",
  };
  return map[theme] ?? theme;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThemeHeatmap({ data }: ThemeHeatmapProps) {
  // Build a lookup: competitor slug -> theme -> count
  const { matrix, maxCount } = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    let max = 0;

    for (const competitor of data) {
      const themeMap = new Map<string, number>();
      for (const t of competitor.themes) {
        themeMap.set(t.theme, t.count);
        if (t.count > max) max = t.count;
      }
      m.set(competitor.slug, themeMap);
    }

    return { matrix: m, maxCount: max };
  }, [data]);

  const themes = [...PUBLICATION_THEMES];

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theme Distribution</CardTitle>
          <CardDescription>
            Publications per theme per competitor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No theme distribution data available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Distribution</CardTitle>
        <CardDescription>
          Publication count by competitor and theme. Darker cells indicate higher
          volumes.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <TooltipProvider delayDuration={150}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-muted-foreground">
                  Competitor
                </th>
                {themes.map((theme) => (
                  <th
                    scope="col"
                    key={theme}
                    className="px-3 py-2 text-center font-medium text-muted-foreground"
                  >
                    <span className="hidden lg:inline">{shortenTheme(theme)}</span>
                    <span className="lg:hidden">{shortenTheme(theme)}</span>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-center font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((competitor) => {
                const themeMap = matrix.get(competitor.slug);
                const rowTotal = competitor.themes.reduce(
                  (sum, t) => sum + t.count,
                  0
                );

                return (
                  <tr
                    key={competitor.slug}
                    className="border-t transition-colors hover:bg-muted/30"
                  >
                    <td className="sticky left-0 z-10 bg-card px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              competitor.brandColor ?? BRAND_COLOR_FALLBACK,
                          }}
                        />
                        <span className="font-medium whitespace-nowrap">
                          {competitor.competitorName}
                        </span>
                      </div>
                    </td>
                    {themes.map((theme) => {
                      const count = themeMap?.get(theme) ?? 0;
                      const style = getIntensityStyle(count, maxCount);

                      return (
                        <td key={theme} className="px-1 py-1 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "mx-auto flex h-9 w-full min-w-[3rem] items-center justify-center rounded-md text-xs font-medium transition-colors",
                                  count === 0 && "text-muted-foreground/40"
                                )}
                                style={
                                  count > 0
                                    ? {
                                        backgroundColor: style.backgroundColor,
                                        color: style.color,
                                      }
                                    : undefined
                                }
                              >
                                {count > 0 ? count : "\u2014"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">
                                {competitor.competitorName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {theme}: {count} publication
                                {count !== 1 ? "s" : ""}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-semibold">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
