"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parse } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { COMPETITOR_COLORS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompetitorMeta {
  slug: string;
  name: string;
  brandColor: string | null;
}

export interface TrendDataPoint {
  month: string; // "YYYY-MM"
  [competitorSlug: string]: string | number;
}

export interface PublicationTrendChartProps {
  data: TrendDataPoint[];
  competitors: CompetitorMeta[];
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    name: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !label) return null;

  // Format month label nicely
  let formattedLabel = label;
  try {
    const date = parse(label, "yyyy-MM", new Date());
    formattedLabel = format(date, "MMMM yyyy");
  } catch {
    // keep raw label
  }

  const total = payload.reduce((sum, entry) => sum + (entry.value ?? 0), 0);

  return (
    <div className="rounded-lg border bg-card px-4 py-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-card-foreground">
        {formattedLabel}
      </p>
      {payload
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((entry) => (
          <div
            key={entry.dataKey}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium text-card-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      <div className="mt-2 border-t pt-1 text-xs font-semibold text-card-foreground">
        Total: {total}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicationTrendChart({
  data,
  competitors,
}: PublicationTrendChartProps) {
  // Format x-axis labels: "YYYY-MM" -> "MMM 'YY"
  const formattedData = useMemo(
    () =>
      data.map((d) => {
        let label = d.month;
        try {
          const date = parse(d.month, "yyyy-MM", new Date());
          label = format(date, "MMM ''yy");
        } catch {
          // keep raw
        }
        return { ...d, monthLabel: label };
      }),
    [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publication Volume Over Time</CardTitle>
        <CardDescription>
          Monthly publication counts by competitor
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No trend data available for the selected period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {competitors.map((comp) => {
                  const color =
                    comp.brandColor ??
                    COMPETITOR_COLORS[comp.slug] ??
                    "#888888";
                  return (
                    <linearGradient
                      key={comp.slug}
                      id={`gradient-${comp.slug}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={color}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={color}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              {competitors.map((comp) => {
                const color =
                  comp.brandColor ??
                  COMPETITOR_COLORS[comp.slug] ??
                  "#888888";
                return (
                  <Area
                    key={comp.slug}
                    type="monotone"
                    dataKey={comp.slug}
                    name={comp.name}
                    stackId="1"
                    stroke={color}
                    fill={`url(#gradient-${comp.slug})`}
                    strokeWidth={2}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
