"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  User2,
  FileType,
  Globe,
  Building2,
  Brain,
  Tag,
  Target,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types - mirrors the Prisma Publication model with competitor relation
// ---------------------------------------------------------------------------

interface CompetitorInfo {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  category: string;
  brandColor: string | null;
}

interface PublicationDetail {
  id: string;
  competitorId: string;
  competitor: CompetitorInfo;
  title: string;
  url: string;
  publishedDate: Date | string | null;
  contentType: string | null;
  authors: string[];
  rawHtml: string | null;
  extractedText: string | null;
  wordCount: number | null;
  primaryTheme: string | null;
  secondaryThemes: string[];
  keywords: string[];
  frameworksMentioned: string[];
  sectorsMentioned: string[];
  geographiesMentioned: string[];
  targetAudience: string | null;
  aiSummary: string | null;
  keyMessagingPoints: string[];
  competitivePositioningNotes: string | null;
  confidenceScore: number | null;
  aiClassifiedAt: Date | string | null;
  firstSeenAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface PublicationDetailClientProps {
  id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "\u2014";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "MMMM d, yyyy");
  } catch {
    return "\u2014";
  }
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "\u2014";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "\u2014";
  }
}

function confidenceLabel(score: number | null): { text: string; className: string } {
  if (score === null) return { text: "Not scored", className: "text-muted-foreground" };
  const pct = Math.round(score * 100);
  if (score >= 0.8) return { text: `${pct}% - High`, className: "text-emerald-600" };
  if (score >= 0.6) return { text: `${pct}% - Medium`, className: "text-amber-600" };
  return { text: `${pct}% - Low`, className: "text-red-500" };
}

// ---------------------------------------------------------------------------
// Tag list component
// ---------------------------------------------------------------------------

function TagList({ items, icon: Icon, label }: { items: string[]; icon: React.ComponentType<{ className?: string }>; label: string }) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicationDetailClient({ id }: PublicationDetailClientProps) {
  const [rawTextExpanded, setRawTextExpanded] = useState(false);

  const { data: publication, isLoading, isError } =
    trpc.publications.getById.useQuery({ id });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="space-y-6">
            <div className="h-80 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !publication) {
    return (
      <div className="space-y-6">
        <Link href="/publications">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Publications
          </Button>
        </Link>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <p className="text-lg font-semibold">Publication not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The publication you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const confidence = confidenceLabel(publication.confidenceScore);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/publications">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Publications
        </Button>
      </Link>

      {/* Title and meta */}
      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight lg:text-3xl">
          {publication.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {/* Competitor badge */}
          <Badge
            variant="outline"
            className="text-sm"
            style={{
              borderColor: publication.competitor.brandColor ?? undefined,
              color: publication.competitor.brandColor ?? undefined,
            }}
          >
            <Building2 className="mr-1 h-3 w-3" />
            {publication.competitor.name}
          </Badge>

          {/* Published date */}
          {publication.publishedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(publication.publishedDate)}
            </span>
          )}

          {/* Content type */}
          {publication.contentType && (
            <span className="flex items-center gap-1">
              <FileType className="h-3.5 w-3.5" />
              {publication.contentType}
            </span>
          )}

          {/* Word count */}
          {publication.wordCount && (
            <span>{publication.wordCount.toLocaleString()} words</span>
          )}

          {/* External link */}
          <a
            href={publication.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View original
          </a>
        </div>

        {/* Authors */}
        {publication.authors.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <User2 className="h-3.5 w-3.5" />
            {publication.authors.join(", ")}
          </div>
        )}
      </div>

      <Separator />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI Summary */}
          {publication.aiSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  {publication.aiSummary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Key Messaging Points */}
          {publication.keyMessagingPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Key Messaging Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {publication.keyMessagingPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Competitive Positioning Notes */}
          {publication.competitivePositioningNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Competitive Positioning Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  {publication.competitivePositioningNotes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Raw / Extracted Text (collapsible) */}
          {publication.extractedText && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Extracted Text</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRawTextExpanded((v) => !v)}
                  >
                    {rawTextExpanded ? (
                      <>
                        Collapse <ChevronUp className="ml-1 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Expand <ChevronDown className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  {publication.wordCount
                    ? `${publication.wordCount.toLocaleString()} words`
                    : "Full text extracted from the source"}
                </CardDescription>
              </CardHeader>
              {rawTextExpanded && (
                <CardContent>
                  <ScrollArea className="max-h-[500px]">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {publication.extractedText}
                    </pre>
                  </ScrollArea>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Right column - 1/3 */}
        <div className="space-y-6">
          {/* AI Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                AI Classification
              </CardTitle>
              {publication.aiClassifiedAt && (
                <CardDescription>
                  Classified {formatDateTime(publication.aiClassifiedAt)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Confidence */}
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Confidence Score
                </div>
                <span className={cn("text-sm font-semibold", confidence.className)}>
                  {confidence.text}
                </span>
                {publication.confidenceScore !== null && (
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        publication.confidenceScore >= 0.8
                          ? "bg-emerald-500"
                          : publication.confidenceScore >= 0.6
                          ? "bg-amber-500"
                          : "bg-red-500"
                      )}
                      style={{
                        width: `${Math.round(publication.confidenceScore * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Primary theme */}
              {publication.primaryTheme && (
                <div>
                  <div className="mb-1.5 text-sm font-medium text-muted-foreground">
                    Primary Theme
                  </div>
                  <Badge variant="default" className="text-xs">
                    {publication.primaryTheme}
                  </Badge>
                </div>
              )}

              {/* Secondary themes */}
              {publication.secondaryThemes.length > 0 && (
                <div>
                  <div className="mb-1.5 text-sm font-medium text-muted-foreground">
                    Secondary Themes
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {publication.secondaryThemes.map((theme) => (
                      <Badge key={theme} variant="secondary" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Target audience */}
              {publication.targetAudience && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User2 className="h-3.5 w-3.5" />
                    Target Audience
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {publication.targetAudience}
                  </p>
                </div>
              )}

              <Separator />

              {/* Keywords */}
              <TagList items={publication.keywords} icon={Tag} label="Keywords" />

              {/* Frameworks */}
              <TagList
                items={publication.frameworksMentioned}
                icon={FileType}
                label="Frameworks Mentioned"
              />

              {/* Sectors */}
              <TagList
                items={publication.sectorsMentioned}
                icon={Building2}
                label="Sectors Mentioned"
              />

              {/* Geographies */}
              <TagList
                items={publication.geographiesMentioned}
                icon={Globe}
                label="Geographies Mentioned"
              />
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">First Seen</span>
                <span>{formatDate(publication.firstSeenAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(publication.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(publication.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="truncate ml-4 max-w-[160px] font-mono text-xs text-muted-foreground">
                  {publication.id}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
