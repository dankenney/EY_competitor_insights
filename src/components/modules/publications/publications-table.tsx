"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  ExternalLink,
} from "lucide-react";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PUBLICATION_THEMES, CONTENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompetitorInfo {
  name: string;
  slug: string;
  brandColor: string | null;
}

export interface PublicationRow {
  id: string;
  title: string;
  competitorId: string;
  competitor: CompetitorInfo;
  primaryTheme: string | null;
  contentType: string | null;
  publishedDate: Date | string | null;
  confidenceScore: number | null;
  url: string;
}

export interface PublicationsTableProps {
  data: PublicationRow[];
  competitors: CompetitorInfo[];
}

type SortKey = "title" | "competitor" | "primaryTheme" | "contentType" | "publishedDate" | "confidenceScore";
type SortDirection = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string | null): string {
  if (!date) return "\u2014";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "MMM d, yyyy");
  } catch {
    return "\u2014";
  }
}

function formatConfidence(score: number | null): string {
  if (score === null || score === undefined) return "\u2014";
  return `${Math.round(score * 100)}%`;
}

function confidenceColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 0.8) return "text-emerald-600";
  if (score >= 0.6) return "text-amber-600";
  return "text-red-500";
}

// ---------------------------------------------------------------------------
// Sort icon
// ---------------------------------------------------------------------------

function SortIcon({
  column,
  activeColumn,
  direction,
}: {
  column: SortKey;
  activeColumn: SortKey;
  direction: SortDirection;
}) {
  if (column !== activeColumn) {
    return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  }
  return direction === "asc" ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicationsTable({ data, competitors }: PublicationsTableProps) {
  const router = useRouter();

  // --- State ---
  const [search, setSearch] = useState("");
  const [competitorFilter, setCompetitorFilter] = useState<string>("");
  const [themeFilter, setThemeFilter] = useState<string>("");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("publishedDate");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // --- Toggle sort ---
  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

  // --- Filtered + sorted data ---
  const filteredData = useMemo(() => {
    let result = [...data];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }

    // Competitor filter
    if (competitorFilter) {
      result = result.filter((r) => r.competitor.slug === competitorFilter);
    }

    // Theme filter
    if (themeFilter) {
      result = result.filter((r) => r.primaryTheme === themeFilter);
    }

    // Content type filter
    if (contentTypeFilter) {
      result = result.filter((r) => r.contentType === contentTypeFilter);
    }

    // Sort
    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      switch (sortKey) {
        case "title":
          return dir * a.title.localeCompare(b.title);
        case "competitor":
          return dir * a.competitor.name.localeCompare(b.competitor.name);
        case "primaryTheme":
          return dir * (a.primaryTheme ?? "").localeCompare(b.primaryTheme ?? "");
        case "contentType":
          return dir * (a.contentType ?? "").localeCompare(b.contentType ?? "");
        case "publishedDate": {
          const da = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
          const db = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
          return dir * (da - db);
        }
        case "confidenceScore": {
          const ca = a.confidenceScore ?? -1;
          const cb = b.confidenceScore ?? -1;
          return dir * (ca - cb);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [data, search, competitorFilter, themeFilter, contentTypeFilter, sortKey, sortDir]);

  // --- Unique competitors from data ---
  const uniqueCompetitors = useMemo(() => {
    if (competitors.length > 0) return competitors;
    const seen = new Map<string, CompetitorInfo>();
    for (const row of data) {
      if (!seen.has(row.competitor.slug)) {
        seen.set(row.competitor.slug, row.competitor);
      }
    }
    return Array.from(seen.values());
  }, [data, competitors]);

  // --- Column header ---
  const ColHeader = ({
    label,
    sortColumn,
    className,
  }: {
    label: string;
    sortColumn: SortKey;
    className?: string;
  }) => (
    <th scope="col" className={cn("px-4 py-3 text-left", className)}>
      <button
        type="button"
        onClick={() => toggleSort(sortColumn)}
        className="inline-flex items-center text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
        <SortIcon column={sortColumn} activeColumn={sortKey} direction={sortDir} />
      </button>
    </th>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Publications</CardTitle>
            <CardDescription>
              {filteredData.length} of {data.length} publication{data.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Competitor filter */}
          <select
            value={competitorFilter}
            onChange={(e) => setCompetitorFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Competitors</option>
            {uniqueCompetitors.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Theme filter */}
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Themes</option>
            {PUBLICATION_THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Content type filter */}
          <select
            value={contentTypeFilter}
            onChange={(e) => setContentTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Types</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Clear filters */}
          {(search || competitorFilter || themeFilter || contentTypeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCompetitorFilter("");
                setThemeFilter("");
                setContentTypeFilter("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-t bg-muted/30">
                  <ColHeader label="Title" sortColumn="title" className="min-w-[280px]" />
                  <ColHeader label="Competitor" sortColumn="competitor" className="min-w-[130px]" />
                  <ColHeader label="Theme" sortColumn="primaryTheme" className="min-w-[140px]" />
                  <ColHeader label="Type" sortColumn="contentType" className="min-w-[110px]" />
                  <ColHeader label="Date" sortColumn="publishedDate" className="min-w-[110px]" />
                  <ColHeader label="Confidence" sortColumn="confidenceScore" className="min-w-[90px]" />
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-sm text-muted-foreground"
                    >
                      No publications match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((pub) => (
                    <tr
                      key={pub.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(`/publications/${pub.id}`)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/publications/${pub.id}`); } }}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {/* Title */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-medium leading-snug line-clamp-2">
                            {pub.title}
                          </span>
                          {pub.url && (
                            <a
                              href={pub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Competitor */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="whitespace-nowrap"
                          style={{
                            borderColor: pub.competitor.brandColor ?? undefined,
                            color: pub.competitor.brandColor ?? undefined,
                          }}
                        >
                          {pub.competitor.name}
                        </Badge>
                      </td>

                      {/* Theme */}
                      <td className="px-4 py-3">
                        {pub.primaryTheme ? (
                          <Badge variant="secondary" className="whitespace-nowrap text-xs">
                            {pub.primaryTheme}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{"\u2014"}</span>
                        )}
                      </td>

                      {/* Content Type */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {pub.contentType ?? "\u2014"}
                        </span>
                      </td>

                      {/* Published Date */}
                      <td className="px-4 py-3">
                        <span className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(pub.publishedDate)}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            confidenceColor(pub.confidenceScore)
                          )}
                        >
                          {formatConfidence(pub.confidenceScore)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
