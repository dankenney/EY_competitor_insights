"use client";

import {
  FileText,
  CheckCircle2,
  Building2,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BRAND_COLOR_FALLBACK } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompetitorCount {
  competitorId: string;
  competitorName: string;
  slug: string;
  brandColor: string | null;
  count: number;
}

interface ThemeCount {
  theme: string;
  count: number;
}

export interface PublicationStatsData {
  total: number;
  byCompetitor: CompetitorCount[];
  byTheme: ThemeCount[];
  classified: number;
  unclassified: number;
  thisMonthCount: number;
}

interface PublicationStatsProps {
  data: PublicationStatsData;
}

// ---------------------------------------------------------------------------
// Mini donut chart (SVG) for theme breakdown
// ---------------------------------------------------------------------------

const THEME_COLORS = [
  "#00A3E0", // Climate change and biodiversity
  "#86BC25", // ESG reporting and regulations
  "#EB8C00", // ESG Managed Services
  "#00338D", // Sustainable finance
  "#A100FF", // Climate tech
  "var(--ey-gray-medium)", // fallback
];

function MiniDonut({ themes }: { themes: ThemeCount[] }) {
  const total = themes.reduce((sum, t) => sum + t.count, 0);
  if (total === 0) {
    return (
      <svg viewBox="0 0 36 36" className="h-16 w-16">
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted"
        />
      </svg>
    );
  }

  let cumulativePercent = 0;
  const segments = themes.map((theme, i) => {
    const percent = (theme.count / total) * 100;
    const offset = cumulativePercent;
    cumulativePercent += percent;
    return { percent, offset, color: THEME_COLORS[i % THEME_COLORS.length] };
  });

  return (
    <svg viewBox="0 0 36 36" className="h-16 w-16">
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke={seg.color}
          strokeWidth="4"
          strokeDasharray={`${seg.percent} ${100 - seg.percent}`}
          strokeDashoffset={-seg.offset}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicationStats({ data }: PublicationStatsProps) {
  const classifiedPct =
    data.total > 0
      ? Math.round((data.classified / data.total) * 100)
      : 0;

  const topPublisher =
    data.byCompetitor.length > 0
      ? data.byCompetitor.reduce((prev, curr) =>
          curr.count > prev.count ? curr : prev
        )
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Publications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Publications
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.total.toLocaleString()}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {data.byCompetitor.length} competitor{data.byCompetitor.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Theme Breakdown (Mini Donut) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            By Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <MiniDonut themes={data.byTheme} />
            <div className="flex-1 space-y-1">
              {data.byTheme.slice(0, 3).map((t, i) => (
                <div key={t.theme} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: THEME_COLORS[i % THEME_COLORS.length] }}
                  />
                  <span className="truncate text-muted-foreground">{t.theme}</span>
                  <span className="ml-auto font-medium">{t.count}</span>
                </div>
              ))}
              {data.byTheme.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{data.byTheme.length - 3} more
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classified % */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            AI Classified
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{classifiedPct}%</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", "bg-emerald-500")}
              style={{ width: `${classifiedPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.classified.toLocaleString()} of {data.total.toLocaleString()} classified
          </p>
        </CardContent>
      </Card>

      {/* Top Publisher */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top Publisher
          </CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {topPublisher ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: topPublisher.brandColor ?? BRAND_COLOR_FALLBACK }}
                />
                <span className="text-2xl font-bold">{topPublisher.competitorName}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {topPublisher.count.toLocaleString()} publication{topPublisher.count !== 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
