"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Clock3,
  LoaderCircle,
  RefreshCcw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { cn } from "@/lib/utils";

function formatTimestamp(value: Date | null): string {
  if (!value) {
    return "Not available";
  }

  return format(value, "MMM d, yyyy h:mm a");
}

function formatRelative(value: Date | null): string {
  if (!value) {
    return "No completed run yet";
  }

  return `${formatDistanceToNow(value, { addSuffix: true })}`;
}

function formatDuration(durationMs: number | null): string {
  if (!durationMs || durationMs < 1000) {
    return "Under 1s";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "SUCCESS"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
      : status === "FAILED"
        ? "bg-red-500/10 text-red-700 border-red-200"
        : status === "PARTIAL_SUCCESS"
          ? "bg-amber-500/10 text-amber-700 border-amber-200"
          : "bg-blue-500/10 text-blue-700 border-blue-200";

  return (
    <Badge variant="outline" className={cn("font-medium", className)}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function ScraperHealthClient() {
  const [feedback, setFeedback] = useState<{
    tone: "neutral" | "error";
    message: string;
  } | null>(null);

  const utils = trpc.useUtils();
  const statusQuery = trpc.scrapers.status.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const triggerRefresh = trpc.scrapers.triggerPublicationsRefresh.useMutation({
    onSuccess: async (result) => {
      setFeedback({
        tone: result.queued ? "neutral" : "error",
        message: result.message,
      });

      await Promise.all([
        utils.scrapers.status.invalidate(),
        utils.dashboard.invalidate(),
      ]);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error.message,
      });
    },
  });

  const status = statusQuery.data;
  const queueBusy = Boolean(
    status && (status.queue.active > 0 || status.queue.waiting > 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Scraper Health</h1>
          <p className="text-sm text-muted-foreground">
            Queue a manual publications refresh, watch queue activity, and review
            recent scraper runs.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setFeedback(null);
            triggerRefresh.mutate();
          }}
          disabled={triggerRefresh.isPending || queueBusy}
        >
          {triggerRefresh.isPending ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" />
          )}
          Run Publications Refresh
        </Button>
      </div>

      {feedback && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            feedback.tone === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          )}
        >
          {feedback.message}
        </div>
      )}

      {status?.queue.error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Queue status is unavailable right now: {status.queue.error}
        </div>
      )}

      {statusQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : status ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Publications Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold">
                {status.queue.active + status.queue.waiting}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Active: {status.queue.active}</p>
                <p>Waiting: {status.queue.waiting}</p>
                <p>Delayed scheduled jobs: {status.queue.delayed}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Successful Run
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-lg font-semibold">
                {status.lastSuccessfulRun?.scraperName ?? "No successful run"}
              </div>
              <div className="text-xs text-muted-foreground">
                <p>{formatTimestamp(status.lastSuccessfulRun?.completedAt ?? null)}</p>
                <p>{formatRelative(status.lastSuccessfulRun?.completedAt ?? null)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold">
                {status.summary.totalRuns24h === 0
                  ? "0%"
                  : `${Math.round(
                      (status.summary.successRuns24h /
                        status.summary.totalRuns24h) *
                        100
                    )}%`}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Successful: {status.summary.successRuns24h}</p>
                <p>Total runs: {status.summary.totalRuns24h}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Running Right Now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold">
                {status.summary.runningNow}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Failed in last 24h: {status.summary.failedRuns24h}</p>
                <p>
                  Manual refresh also triggers publication classification when
                  scraping finishes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Manual Refresh</CardTitle>
          <CardDescription>
            Use this when production data looks stale. The refresh enqueues a
            publications scrape and then automatically queues classification so
            new items flow through the full pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              The queue will reject duplicate manual runs while another
              publications job is active or waiting.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Activity className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Cache revalidation now runs from the worker after scrape and
              classification complete, so dashboard data should refresh promptly
              once jobs finish.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest By Scraper</CardTitle>
          <CardDescription>
            Most recent recorded run for each scraper.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          ) : status && status.latestByScraper.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {status.latestByScraper.map((run) => (
                <div
                  key={run.id}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{run.scraperName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelative(run.completedAt ?? run.startedAt)}
                      </p>
                    </div>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">
                        {run.itemsFound}
                      </p>
                      <p>Found</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {run.itemsNew}
                      </p>
                      <p>New</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {run.itemsUpdated}
                      </p>
                      <p>Updated</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No scraper runs have been recorded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Run History</CardTitle>
          <CardDescription>
            Latest individual scraper executions across the publications pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusQuery.isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))
          ) : status && status.recentRuns.length > 0 ? (
            status.recentRuns.map((run) => (
              <div
                key={run.id}
                className="rounded-lg border p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{run.scraperName}</span>
                      <StatusBadge status={run.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Started: {formatTimestamp(run.startedAt)}</span>
                      <span>
                        Finished: {formatTimestamp(run.completedAt ?? null)}
                      </span>
                      <span>Duration: {formatDuration(run.durationMs)}</span>
                    </div>
                    {run.errorMessage && (
                      <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{run.errorMessage}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="rounded-md bg-muted/50 px-3 py-2">
                      <p className="font-semibold text-sm">{run.itemsFound}</p>
                      <p className="text-muted-foreground">Found</p>
                    </div>
                    <div className="rounded-md bg-muted/50 px-3 py-2">
                      <p className="font-semibold text-sm">{run.itemsNew}</p>
                      <p className="text-muted-foreground">New</p>
                    </div>
                    <div className="rounded-md bg-muted/50 px-3 py-2">
                      <p className="font-semibold text-sm">{run.itemsUpdated}</p>
                      <p className="text-muted-foreground">Updated</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No scraper history yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
