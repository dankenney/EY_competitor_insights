"use client";

import { useState, useMemo } from "react";
import { format, parse, subMonths, startOfMonth } from "date-fns";
import {
  Scale,
  AlertTriangle,
  Globe,
  TrendingUp,
  Calendar,
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  CardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  JURISDICTIONS,
  DIRECTION_OF_CHANGE,
  IMPACT_LEVELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMPACT_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#22c55e",
};

const IMPACT_ORDER = ["High", "Medium", "Low"];

/* Custom tooltip that enforces High → Medium → Low order with tight spacing */
function ImpactTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const sorted = [...payload].sort((a, b) => {
    const aKey = a.dataKey ?? a.name;
    const bKey = b.dataKey ?? b.name;
    return IMPACT_ORDER.indexOf(aKey === "high" ? "High" : aKey === "medium" ? "Medium" : "Low")
      - IMPACT_ORDER.indexOf(bKey === "high" ? "High" : bKey === "medium" ? "Medium" : "Low");
  });

  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-sm">
      <p className="text-xs font-medium mb-1">{label}</p>
      {sorted.map((entry) => (
        <div key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

const GEOGRAPHY_COLORS: Record<string, string> = {
  US: "#00338D",
  "US-State": "#4169E1",
  Canada: "#E31937",
  EU: "#003399",
  UK: "#00247D",
  China: "#DE2910",
  "APAC-Australia": "#00843D",
  "APAC-HongKong": "#DE2910",
  "APAC-Singapore": "#EF3340",
  "APAC-Japan": "#BC002D",
  Global: "var(--ey-gray-medium)",
};

function impactBadgeVariant(level: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (level === "High") return "destructive";
  if (level === "Medium") return "default";
  return "secondary";
}

type DatePreset = "3m" | "6m" | "12m" | "all";

function getDateRange(preset: DatePreset) {
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

export function RegulatoryDashboardClient() {
  const [datePreset, setDatePreset] = useState<DatePreset>("12m");
  const { dateFrom, dateTo } = useMemo(() => getDateRange(datePreset), [datePreset]);

  // Filters
  const [search, setSearch] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [impactFilter, setImpactFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");

  // tRPC queries
  const statsQuery = trpc.regulatory.getStats.useQuery({ dateFrom, dateTo });
  const timelineQuery = trpc.regulatory.getTimeline.useQuery({
    months: datePreset === "3m" ? 3 : datePreset === "6m" ? 6 : 12,
  });
  const listQuery = trpc.regulatory.list.useQuery({
    page: 1,
    limit: 100,
    dateFrom,
    dateTo,
    geographies: geoFilter ? [geoFilter] : undefined,
    impactLevels: impactFilter ? [impactFilter] : undefined,
    directionsOfChange: directionFilter ? [directionFilter] : undefined,
    search: search || undefined,
  });

  // Filtered timeline data for chart
  const chartData = useMemo(() => {
    if (!timelineQuery.data) return [];
    return timelineQuery.data.map((d) => {
      let label = d.month;
      try {
        const date = parse(d.month, "yyyy-MM", new Date());
        label = format(date, "MMM ''yy");
      } catch {
        // keep raw
      }
      return { ...d, monthLabel: label };
    });
  }, [timelineQuery.data]);

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Period:</span>
        <div className="flex gap-1">
          {(
            [
              { value: "3m" as const, label: "3 months" },
              { value: "6m" as const, label: "6 months" },
              { value: "12m" as const, label: "12 months" },
              { value: "all" as const, label: "All time" },
            ]
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

      {/* Stat cards */}
      {statsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : statsQuery.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Events
              </CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsQuery.data.total}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Across {statsQuery.data.byGeography.length} jurisdictions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Impact
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsQuery.data.highImpact}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Requiring immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Jurisdiction
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsQuery.data.byGeography.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {statsQuery.data.byGeography[0].geography}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statsQuery.data.byGeography[0].count} events
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Direction Trend
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsQuery.data.byDirection.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {statsQuery.data.byDirection[0].direction}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Most common regulatory direction
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="geography">By Geography</TabsTrigger>
          <TabsTrigger value="impact">By Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          {timelineQuery.isLoading ? (
            <ChartSkeleton />
          ) : chartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Events Over Time</CardTitle>
                <CardDescription>
                  Monthly event counts by impact level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
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
                    <Tooltip content={<ImpactTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                    <Bar dataKey="high" name="High Impact" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="medium" name="Medium Impact" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="low" name="Low Impact" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Scale}
              title="No timeline data"
              description="Regulatory event timeline will appear here once events are tracked."
            />
          )}
        </TabsContent>

        <TabsContent value="geography">
          {statsQuery.isLoading ? (
            <ChartSkeleton />
          ) : statsQuery.data && statsQuery.data.byGeography.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Events by Geography</CardTitle>
                <CardDescription>
                  Number of regulatory events per jurisdiction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={statsQuery.data.byGeography}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis
                      dataKey="geography"
                      type="category"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={70}
                    />
                    <Tooltip />
                    <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]}>
                      {statsQuery.data.byGeography.map((entry) => (
                        <Cell
                          key={entry.geography}
                          fill={GEOGRAPHY_COLORS[entry.geography] ?? "var(--ey-gray-medium)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Globe}
              title="No geography data"
              description="Geography breakdown will appear here once events are classified."
            />
          )}
        </TabsContent>

        <TabsContent value="impact">
          {statsQuery.isLoading ? (
            <ChartSkeleton />
          ) : statsQuery.data && statsQuery.data.byImpact.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Events by Impact Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...statsQuery.data.byImpact].sort((a, b) =>
                    IMPACT_ORDER.indexOf(a.impactLevel) - IMPACT_ORDER.indexOf(b.impactLevel)
                  ).map((item) => {
                    const pct = statsQuery.data!.total > 0
                      ? Math.round((item.count / statsQuery.data!.total) * 100)
                      : 0;
                    return (
                      <div key={item.impactLevel} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{item.impactLevel}</span>
                          <span className="text-muted-foreground">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: IMPACT_COLORS[item.impactLevel] ?? "var(--ey-gray-medium)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="No impact data"
              description="Impact distribution will appear here once events are classified."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Events table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Regulatory Events</CardTitle>
              <CardDescription>
                {listQuery.data?.total ?? 0} event{(listQuery.data?.total ?? 0) !== 1 ? "s" : ""} tracked
              </CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={geoFilter}
              onChange={(e) => setGeoFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Jurisdictions</option>
              {JURISDICTIONS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>

            <select
              value={impactFilter}
              onChange={(e) => setImpactFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Impact Levels</option>
              {IMPACT_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Directions</option>
              {DIRECTION_OF_CHANGE.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {(search || geoFilter || impactFilter || directionFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setGeoFilter("");
                  setImpactFilter("");
                  setDirectionFilter("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {listQuery.isLoading ? (
            <TableSkeleton rows={8} />
          ) : listQuery.data && listQuery.data.items.length > 0 ? (
            <ScrollArea className="w-full">
              <div className="min-w-[900px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-t bg-muted/30">
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Title
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Geography
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Impact
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Direction
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Date
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Frameworks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {listQuery.data.items.map((evt) => (
                      <tr
                        key={evt.id}
                        className="border-b transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <span className="text-sm font-medium leading-snug line-clamp-2">
                              {evt.title}
                            </span>
                            {evt.aiSummary && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {evt.aiSummary}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {evt.geography ?? "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {evt.impactLevel ? (
                            <Badge variant={impactBadgeVariant(evt.impactLevel)} className="text-xs">
                              {evt.impactLevel}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {evt.directionOfChange ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-muted-foreground">
                            {evt.publishedAt
                              ? format(new Date(evt.publishedAt), "MMM d, yyyy")
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {evt.frameworksAffected.slice(0, 3).map((f) => (
                              <Badge key={f} variant="secondary" className="text-xs">
                                {f}
                              </Badge>
                            ))}
                            {evt.frameworksAffected.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{evt.frameworksAffected.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="px-6 pb-6">
              <EmptyState
                icon={Scale}
                title="No regulatory events"
                description="Regulatory events will appear here once they are tracked and classified."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
