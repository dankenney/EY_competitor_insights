"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  Upload,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
  LineChart,
  Line,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CardSkeleton,
  ChartSkeleton,
} from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { COMPETITOR_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function PctChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null || pct === undefined) return <span className="text-xs text-muted-foreground">—</span>;

  const isPositive = pct > 0;
  const isNegative = pct < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isPositive && "text-emerald-600",
        isNegative && "text-red-600",
        !isPositive && !isNegative && "text-muted-foreground"
      )}
    >
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : isNegative ? (
        <ArrowDownRight className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// CSV Upload Dialog
// ---------------------------------------------------------------------------

function CsvUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "uploading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadCount, setUploadCount] = useState(0);

  const utils = trpc.useUtils();
  const bulkUpload = trpc.headcount.bulkUpload.useMutation({
    onSuccess: (data) => {
      setStatus("done");
      setUploadCount(data.uploaded);
      utils.headcount.invalidate();
      utils.dashboard.invalidate();
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("parsing");
    setErrorMsg("");

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setStatus("error");
        setErrorMsg("CSV must have a header row and at least one data row.");
        return;
      }

      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

      // Required columns
      const compIdx = header.indexOf("competitor_id");
      const dateIdx = header.indexOf("snapshot_date");
      if (compIdx === -1 || dateIdx === -1) {
        setStatus("error");
        setErrorMsg("CSV must include 'competitor_id' and 'snapshot_date' columns.");
        return;
      }

      // Optional columns
      const colMap: Record<string, number> = {};
      const optionalCols = [
        "total", "us", "uk", "eu", "india", "apac", "other",
        "pct_change", "notes", "confidence_level", "data_source",
      ];
      for (const col of optionalCols) {
        const idx = header.indexOf(col);
        if (idx !== -1) colMap[col] = idx;
      }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const competitorId = cols[compIdx];
        const dateStr = cols[dateIdx];
        if (!competitorId || !dateStr) continue;

        rows.push({
          competitorId,
          snapshotDate: new Date(dateStr),
          dataSource: colMap["data_source"] !== undefined ? cols[colMap["data_source"]] || "Manual CSV Upload" : "Manual CSV Upload",
          totalSustainabilityHeadcount: colMap["total"] !== undefined ? parseInt(cols[colMap["total"]]) || null : null,
          usHeadcount: colMap["us"] !== undefined ? parseInt(cols[colMap["us"]]) || null : null,
          ukHeadcount: colMap["uk"] !== undefined ? parseInt(cols[colMap["uk"]]) || null : null,
          euHeadcount: colMap["eu"] !== undefined ? parseInt(cols[colMap["eu"]]) || null : null,
          indiaHeadcount: colMap["india"] !== undefined ? parseInt(cols[colMap["india"]]) || null : null,
          apacHeadcount: colMap["apac"] !== undefined ? parseInt(cols[colMap["apac"]]) || null : null,
          otherHeadcount: colMap["other"] !== undefined ? parseInt(cols[colMap["other"]]) || null : null,
          notes: colMap["notes"] !== undefined ? cols[colMap["notes"]] || null : null,
          confidenceLevel: colMap["confidence_level"] !== undefined ? cols[colMap["confidence_level"]] || null : null,
        });
      }

      if (rows.length === 0) {
        setStatus("error");
        setErrorMsg("No valid data rows found in CSV.");
        return;
      }

      setStatus("uploading");
      bulkUpload.mutate({ rows });
    } catch {
      setStatus("error");
      setErrorMsg("Failed to parse CSV file.");
    }
  }, [bulkUpload]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Headcount CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with competitor headcount data. Required columns:
            <code className="ml-1 text-xs">competitor_id, snapshot_date</code>.
            Optional: <code className="text-xs">total, us, uk, eu, india, apac, other, notes, data_source</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {status === "done" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="font-medium text-emerald-800">
                Successfully uploaded {uploadCount} rows
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setStatus("idle");
                  onOpenChange(false);
                }}
              >
                Close
              </Button>
            </div>
          ) : status === "error" ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">{errorMsg}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStatus("idle")}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50 hover:bg-muted/30"
                onClick={() => fileRef.current?.click()}
              >
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  {status === "parsing" || status === "uploading"
                    ? status === "parsing" ? "Parsing CSV..." : "Uploading..."
                    : "Click to select CSV file"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  .csv files only
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFile}
                disabled={status !== "idle"}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function HeadcountDashboardClient() {
  const [uploadOpen, setUploadOpen] = useState(false);

  // tRPC queries
  const comparisonQuery = trpc.headcount.getComparison.useQuery({});
  const trendsQuery = trpc.headcount.getTrends.useQuery({});

  // Derived stats
  const stats = useMemo(() => {
    if (!comparisonQuery.data) return null;
    const withData = comparisonQuery.data.filter((c) => c.snapshot !== null);
    const totalHeadcount = withData.reduce((sum, c) => sum + (c.snapshot?.total ?? 0), 0);
    const largestTeam = withData.length > 0 ? withData[0] : null;
    const growing = withData.filter((c) => (c.snapshot?.pctChange ?? 0) > 0);
    const shrinking = withData.filter((c) => (c.snapshot?.pctChange ?? 0) < 0);

    return { totalHeadcount, largestTeam, competitorsWithData: withData.length, growing: growing.length, shrinking: shrinking.length };
  }, [comparisonQuery.data]);

  // Chart data
  const barChartData = useMemo(() => {
    if (!comparisonQuery.data) return [];
    return comparisonQuery.data
      .filter((c) => c.snapshot && c.snapshot.total > 0)
      .map((c) => ({
        name: c.shortName ?? c.name,
        slug: c.slug,
        total: c.snapshot!.total,
        pctChange: c.snapshot!.pctChange,
        brandColor: c.brandColor,
      }));
  }, [comparisonQuery.data]);

  return (
    <div className="space-y-6">
      {/* Upload button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
      </div>

      <CsvUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      {/* Stat cards */}
      {comparisonQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tracked
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.totalHeadcount)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Across {stats.competitorsWithData} competitors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Largest Team
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.largestTeam?.snapshot ? (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: stats.largestTeam.brandColor ?? "#888" }}
                    />
                    <span className="text-2xl font-bold">
                      {stats.largestTeam.shortName ?? stats.largestTeam.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNumber(stats.largestTeam.snapshot.total)} sustainability professionals
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
                Growing
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.growing}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Competitors expanding teams
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Shrinking
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.shrinking}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Competitors reducing teams
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts */}
      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="trends">Trends Over Time</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          {comparisonQuery.isLoading ? (
            <ChartSkeleton />
          ) : barChartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Sustainability Headcount Comparison</CardTitle>
                <CardDescription>
                  Latest reported sustainability practice headcount by competitor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={barChartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="name"
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
                      width={50}
                    />
                    <Tooltip
                      formatter={(value) => [(value as number).toLocaleString(), "Headcount"]}
                    />
                    <Bar dataKey="total" name="Headcount" radius={[4, 4, 0, 0]}>
                      {barChartData.map((entry) => (
                        <Cell
                          key={entry.slug}
                          fill={entry.brandColor ?? COMPETITOR_COLORS[entry.slug] ?? "var(--ey-gray-medium)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No headcount data"
              description="Upload a CSV file with competitor headcount data to see comparisons."
              action={{ label: "Upload CSV", onClick: () => setUploadOpen(true) }}
            />
          )}
        </TabsContent>

        <TabsContent value="trends">
          {trendsQuery.isLoading ? (
            <ChartSkeleton />
          ) : trendsQuery.data && trendsQuery.data.trends.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Headcount Trends Over Time</CardTitle>
                <CardDescription>
                  Sustainability practice headcount changes over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={trendsQuery.data.trends}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="date"
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
                      width={50}
                    />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                    {trendsQuery.data.competitors.map((comp) => (
                      <Line
                        key={comp.slug}
                        type="monotone"
                        dataKey={comp.slug}
                        name={comp.name}
                        stroke={comp.brandColor ?? COMPETITOR_COLORS[comp.slug] ?? "var(--ey-gray-medium)"}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No trend data"
              description="Multiple headcount snapshots over time are needed to display trends."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Detailed table */}
      {comparisonQuery.data && comparisonQuery.data.some((c) => c.snapshot) && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Headcount Breakdown</CardTitle>
            <CardDescription>
              Regional breakdown of sustainability practice headcount
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-t bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Competitor
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      US
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      UK
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      EU
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      India
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      APAC
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Change
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonQuery.data
                    .filter((c) => c.snapshot)
                    .map((comp) => (
                      <tr
                        key={comp.id}
                        className="border-b transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: comp.brandColor ?? "#888" }}
                            />
                            <span className="font-medium">
                              {comp.shortName ?? comp.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {comp.snapshot!.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {comp.snapshot!.us || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {comp.snapshot!.uk || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {comp.snapshot!.eu || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {comp.snapshot!.india || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {comp.snapshot!.apac || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <PctChangeBadge pct={comp.snapshot!.pctChange ?? null} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant="outline" className="text-xs">
                            {comp.snapshot!.dataSource}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
