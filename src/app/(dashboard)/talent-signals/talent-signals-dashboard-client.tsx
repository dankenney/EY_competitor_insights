"use client";

import { useState, useMemo } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import {
  Users,
  UserMinus,
  UserPlus,
  Building2,
  Calendar,
  Search,
  Globe,
  Briefcase,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BRAND_COLOR_FALLBACK } from "@/lib/constants";
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
import {
  CardSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  "Practice Restructuring": <Building2 className="h-4 w-4" />,
  "Leadership Appointment": <UserPlus className="h-4 w-4" />,
  "Leadership Departure": <UserMinus className="h-4 w-4" />,
  "Team Expansion": <UserPlus className="h-4 w-4" />,
  "Team Reduction": <UserMinus className="h-4 w-4" />,
  Acquisition: <Briefcase className="h-4 w-4" />,
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  "Practice Restructuring": "bg-purple-100 text-purple-800 border-purple-200",
  "Leadership Appointment": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Leadership Departure": "bg-amber-100 text-amber-800 border-amber-200",
  "Team Expansion": "bg-blue-100 text-blue-800 border-blue-200",
  "Team Reduction": "bg-red-100 text-red-800 border-red-200",
  Acquisition: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

type DatePreset = "6m" | "12m" | "24m" | "all";

function getDateRange(preset: DatePreset) {
  const now = new Date();
  switch (preset) {
    case "6m":
      return { dateFrom: startOfMonth(subMonths(now, 6)), dateTo: now };
    case "12m":
      return { dateFrom: startOfMonth(subMonths(now, 12)), dateTo: now };
    case "24m":
      return { dateFrom: startOfMonth(subMonths(now, 24)), dateTo: now };
    case "all":
    default:
      return { dateFrom: undefined, dateTo: undefined };
  }
}

// ---------------------------------------------------------------------------
// Timeline Item Component
// ---------------------------------------------------------------------------

interface TimelineEvent {
  id: string;
  company: string;
  eventType: string | null;
  eventDate: Date | string | null;
  headcountAffected: number | null;
  division: string | null;
  geography: string | null;
  driver: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  aiSummary: string | null;
  verified: boolean;
  competitor: {
    name: string;
    slug: string;
    brandColor: string | null;
  } | null;
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const colorClass = EVENT_TYPE_COLORS[event.eventType ?? ""] ?? "bg-gray-100 text-gray-800 border-gray-200";
  const icon = EVENT_TYPE_ICONS[event.eventType ?? ""] ?? <AlertCircle className="h-4 w-4" />;

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
            colorClass
          )}
        >
          {icon}
        </div>
        <div className="w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Competitor badge */}
          {event.competitor && (
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: event.competitor.brandColor ?? undefined,
                color: event.competitor.brandColor ?? undefined,
              }}
            >
              {event.competitor.name}
            </Badge>
          )}

          {/* Event type */}
          {event.eventType && (
            <Badge variant="secondary" className="text-xs">
              {event.eventType}
            </Badge>
          )}

          {/* Date */}
          <span className="text-xs text-muted-foreground">
            {event.eventDate
              ? format(new Date(event.eventDate), "MMM d, yyyy")
              : "Date unknown"}
          </span>

          {/* Verified */}
          {event.verified && (
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
              Verified
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-1.5 text-sm font-semibold leading-snug">
          {event.company}
          {event.division && (
            <span className="font-normal text-muted-foreground">
              {" "}
              &mdash; {event.division}
            </span>
          )}
        </h3>

        {/* Summary */}
        {event.aiSummary && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {event.aiSummary}
          </p>
        )}

        {/* Metadata row */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {event.headcountAffected && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.headcountAffected.toLocaleString()} affected
            </span>
          )}
          {event.geography && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {event.geography}
            </span>
          )}
          {event.driver && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {event.driver}
            </span>
          )}
          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {event.sourceName ?? "Source"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TalentSignalsDashboardClient() {
  const [datePreset, setDatePreset] = useState<DatePreset>("12m");
  const { dateFrom, dateTo } = useMemo(() => getDateRange(datePreset), [datePreset]);

  const [search, setSearch] = useState("");
  const [competitorFilter, setCompetitorFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");

  // tRPC queries
  const statsQuery = trpc.talentSignals.getStats.useQuery({ dateFrom, dateTo });
  const timelineQuery = trpc.talentSignals.getTimeline.useQuery({ months: 24 });
  const eventTypesQuery = trpc.talentSignals.getEventTypes.useQuery();

  // Get unique competitors for filter
  const competitors = useMemo(() => {
    if (!timelineQuery.data) return [];
    const seen = new Map<string, { name: string; slug: string; brandColor: string | null }>();
    for (const evt of timelineQuery.data) {
      if (evt.competitor && !seen.has(evt.competitor.slug)) {
        seen.set(evt.competitor.slug, evt.competitor);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [timelineQuery.data]);

  // Filter timeline events
  const filteredEvents = useMemo(() => {
    if (!timelineQuery.data) return [];
    let events = [...timelineQuery.data];

    // Date filter
    if (dateFrom) {
      events = events.filter(
        (e) => e.eventDate && new Date(e.eventDate) >= dateFrom
      );
    }

    // Competitor filter
    if (competitorFilter) {
      events = events.filter((e) => e.competitor?.slug === competitorFilter);
    }

    // Event type filter
    if (eventTypeFilter) {
      events = events.filter((e) => e.eventType === eventTypeFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      events = events.filter(
        (e) =>
          e.company.toLowerCase().includes(q) ||
          e.aiSummary?.toLowerCase().includes(q) ||
          e.division?.toLowerCase().includes(q)
      );
    }

    return events;
  }, [timelineQuery.data, dateFrom, competitorFilter, eventTypeFilter, search]);

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Period:</span>
        <div className="flex gap-1">
          {(
            [
              { value: "6m" as const, label: "6 months" },
              { value: "12m" as const, label: "12 months" },
              { value: "24m" as const, label: "24 months" },
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
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsQuery.data.total}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sustainability talent signals tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                People Affected
              </CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsQuery.data.totalAffected.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Across all tracked events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Event Type
              </CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsQuery.data.byEventType.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {statsQuery.data.byEventType[0].eventType}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statsQuery.data.byEventType[0].count} events
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
                Most Active Competitor
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsQuery.data.byCompetitor.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: statsQuery.data.byCompetitor[0].brandColor ?? BRAND_COLOR_FALLBACK,
                      }}
                    />
                    <span className="text-2xl font-bold">
                      {statsQuery.data.byCompetitor[0].competitorName}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statsQuery.data.byCompetitor[0].count} signals
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Event type breakdown */}
      {statsQuery.data && statsQuery.data.byEventType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Events by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {statsQuery.data.byEventType.map((et) => {
                const colorClass =
                  EVENT_TYPE_COLORS[et.eventType] ?? "bg-gray-100 text-gray-800 border-gray-200";
                return (
                  <div
                    key={et.eventType}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2",
                      colorClass
                    )}
                  >
                    {EVENT_TYPE_ICONS[et.eventType] ?? <AlertCircle className="h-4 w-4" />}
                    <span className="text-sm font-medium">{et.eventType}</span>
                    <span className="text-sm font-bold">{et.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Event Timeline</CardTitle>
              <CardDescription>
                {filteredEvents.length} sustainability talent signal{filteredEvents.length !== 1 ? "s" : ""}
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
              value={competitorFilter}
              onChange={(e) => setCompetitorFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Competitors</option>
              {competitors.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Event Types</option>
              {eventTypesQuery.data?.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.type} ({t.count})
                </option>
              ))}
            </select>

            {(search || competitorFilter || eventTypeFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCompetitorFilter("");
                  setEventTypeFilter("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {timelineQuery.isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="space-y-0">
              {filteredEvents.map((event) => (
                <TimelineItem key={event.id} event={event as TimelineEvent} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No talent signals"
              description="Sustainability talent signals will appear here once events are tracked."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
