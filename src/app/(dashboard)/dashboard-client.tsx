"use client";

import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import {
  FileText,
  Scale,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Activity,
  AlertTriangle,
  Briefcase,
  Clock,
  Building2,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_COLOR_FALLBACK } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  detail,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  detail?: string;
  loading?: boolean;
}) {
  if (loading) return <CardSkeleton />;
  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {detail && (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Activity type badges
// ---------------------------------------------------------------------------

function ActivityBadge({ type }: { type: string }) {
  switch (type) {
    case "publication":
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <FileText className="h-3 w-3" />
          Publication
        </Badge>
      );
    case "regulatory":
      return (
        <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700">
          <Scale className="h-3 w-3" />
          Regulatory
        </Badge>
      );
    case "talent":
      return (
        <Badge variant="outline" className="text-xs gap-1 border-blue-300 text-blue-700">
          <Briefcase className="h-3 w-3" />
          Sustainability Talent
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-xs">{type}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Impact level badge
// ---------------------------------------------------------------------------

function ImpactBadge({ level }: { level: string }) {
  const color =
    level === "High"
      ? "bg-red-100 text-red-700 border-red-200"
      : level === "Medium"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-green-100 text-green-700 border-green-200";
  return (
    <Badge variant="outline" className={cn("text-xs", color)}>
      {level}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export function DashboardClient() {
  const overview = trpc.dashboard.overview.useQuery();
  const competitors = trpc.dashboard.competitorSummary.useQuery();
  const activity = trpc.dashboard.recentActivity.useQuery({ limit: 15 });
  const headcount = trpc.dashboard.headcountComparison.useQuery();
  const regulatory = trpc.dashboard.regulatoryOverview.useQuery();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          CCaSS Competitive Intelligence
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time competitive intelligence across sustainability services.
          Monitoring publications, regulatory shifts, headcount, and market
          positioning.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Competitors Tracked"
          value={overview.data?.competitorCount ?? "--"}
          icon={Building2}
          detail="Active monitoring"
          loading={overview.isLoading}
        />
        <StatCard
          label="Publications"
          value={overview.data?.publicationsTotal?.toLocaleString() ?? "--"}
          icon={FileText}
          detail={
            overview.data
              ? `${overview.data.publicationsThisMonth} in last 30 days`
              : undefined
          }
          loading={overview.isLoading}
        />
        <StatCard
          label="Regulatory Events"
          value={overview.data?.regulatoryTotal ?? "--"}
          icon={Scale}
          detail={
            overview.data
              ? `${overview.data.regulatoryHighImpact} high impact`
              : undefined
          }
          loading={overview.isLoading}
        />
        <StatCard
          label="Last Data Refresh"
          value={
            overview.data?.lastDataRefresh
              ? formatDistanceToNow(new Date(overview.data.lastDataRefresh), {
                  addSuffix: true,
                })
              : "--"
          }
          icon={Clock}
          detail={
            overview.data?.scraperStatus
              ? `Status: ${overview.data.scraperStatus}`
              : undefined
          }
          loading={overview.isLoading}
        />
      </div>

      {/* Two-column: Competitor cards + Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Competitor headcount comparison */}
        <div className="lg:col-span-2 space-y-6">
          {/* Headcount bar chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sustainability Headcount</CardTitle>
                  <CardDescription>
                    Latest estimated team sizes across competitors
                  </CardDescription>
                </div>
                <Link href="/talent">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Details <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {headcount.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-8 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : headcount.data && headcount.data.length > 0 ? (
                <div className="space-y-2.5">
                  {headcount.data.map((comp) => {
                    const maxTotal = Math.max(
                      ...headcount.data!.map((c) => c.total)
                    );
                    const barPct = (comp.total / maxTotal) * 75;
                    return (
                      <div key={comp.slug} className="flex items-center gap-3">
                        <div className="w-24 text-sm font-medium truncate">
                          {comp.name}
                        </div>
                        <div className="flex-1 flex items-center gap-2 h-6">
                          <div
                            className="h-full rounded-md transition-all duration-500 shrink-0"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor: comp.brandColor ?? BRAND_COLOR_FALLBACK,
                              opacity: 0.85,
                            }}
                          />
                          <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                            {comp.total.toLocaleString()}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-0.5 text-xs font-medium w-16 justify-end shrink-0",
                            comp.pctChange !== null && comp.pctChange > 0
                              ? "text-emerald-600"
                              : comp.pctChange !== null && comp.pctChange < 0
                                ? "text-red-500"
                                : "text-muted-foreground"
                          )}
                        >
                          {comp.pctChange !== null ? (
                            <>
                              {comp.pctChange > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : comp.pctChange < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : null}
                              {comp.pctChange > 0 ? "+" : ""}
                              {comp.pctChange.toFixed(1)}%
                            </>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </div>
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

          {/* Regulatory highlights */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Regulatory Landscape</CardTitle>
                  <CardDescription>
                    Key regulatory events affecting sustainability services
                  </CardDescription>
                </div>
                <Link href="/regulatory">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    All events <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {regulatory.isLoading ? (
                <TableSkeleton rows={4} />
              ) : regulatory.data && regulatory.data.events.length > 0 ? (
                <div className="space-y-4">
                  {regulatory.data.events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                          event.impactLevel === "High"
                            ? "bg-red-100"
                            : "bg-amber-100"
                        )}
                      >
                        {event.impactLevel === "High" ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Scale className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-medium leading-tight">
                            {event.title}
                          </h4>
                          {event.impactLevel && (
                            <ImpactBadge level={event.impactLevel} />
                          )}
                        </div>
                        {event.aiSummary && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {event.aiSummary}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          {event.geography && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {event.geography}
                            </span>
                          )}
                          {event.directionOfChange && (
                            <span>{event.directionOfChange}</span>
                          )}
                          {event.frameworksAffected.length > 0 && (
                            <span>
                              {event.frameworksAffected.slice(0, 3).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No regulatory events tracked yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity feed */}
        <div>
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </div>
              <CardDescription>
                Latest intelligence signals across all modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activity.isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                      <div className="h-4 w-full rounded bg-muted animate-pulse" />
                      <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : activity.data && activity.data.length > 0 ? (
                <div className="space-y-4">
                  {activity.data.map((item) => {
                    const href =
                      item.type === "publication"
                        ? `/publications/${item.id}`
                        : item.type === "regulatory"
                          ? "/regulatory"
                          : "/talent";

                    return (
                      <Link
                        key={`${item.type}-${item.id}`}
                        href={href}
                        className="block border-b pb-3 last:border-0 last:pb-0 rounded-md p-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <ActivityBadge type={item.type} />
                          {item.competitor && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: item.brandColor ?? undefined,
                                color: item.brandColor ?? undefined,
                              }}
                            >
                              {item.competitor}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-snug line-clamp-2">
                          {item.title}
                        </p>
                        {item.summary && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                        {item.date && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {format(new Date(item.date), "MMM d, yyyy")}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Competitor cards grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Competitor Overview
          </h2>
          <Link href="/competitors">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {competitors.isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))
            : competitors.data?.map((comp) => (
                <Card
                  key={comp.id}
                  className="group relative transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4">
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
                        {comp.category}
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
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>
    </div>
  );
}
