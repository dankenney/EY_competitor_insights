"use client";

import React, { useState } from "react";
import {
  Brain,
  Zap,
  Handshake,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { COMPETITOR_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reality Score Badge
// ---------------------------------------------------------------------------

function RealityBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">N/A</span>;

  let color = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  let label = "Low";

  if (score >= 0.7) {
    color = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    label = "High";
  } else if (score >= 0.4) {
    color = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    label = "Medium";
  }

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", color)}>
      {label} ({score.toFixed(2)})
    </span>
  );
}

// ---------------------------------------------------------------------------
// Maturity Badge
// ---------------------------------------------------------------------------

function MaturityBadge({ level }: { level: string | null }) {
  if (!level) return null;

  const colors: Record<string, string> = {
    Announced: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    Pilot: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    Deployed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    Scaled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", colors[level] ?? colors.Announced)}>
      {level}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Capability Matrix (Heatmap)
// ---------------------------------------------------------------------------

function CapabilityMatrix({
  data,
}: {
  data: Array<{
    competitorName: string;
    slug: string;
    brandColor: string | null;
    categories: Array<{ category: string; count: number; avgRealityScore: number }>;
  }>;
}) {
  // Get all unique categories
  const allCategories = [
    ...new Set(data.flatMap((d) => d.categories.map((c) => c.category))),
  ].sort();

  // Short category labels for display
  const shortLabels: Record<string, string> = {
    "ESG Data Analytics & Reporting": "ESG Data",
    "Climate Modeling & Scenario Analysis": "Climate Model",
    "Supply Chain Traceability & Due Diligence": "Supply Chain",
    "Regulatory Intelligence & Compliance": "Reg Intel",
    "Sustainability Assurance Automation": "Assurance",
    "Carbon Accounting & Emissions Management": "Carbon Acct",
    "Biodiversity & Nature Analytics": "Biodiversity",
    "Sustainable Finance & Investment Screening": "Sust Finance",
    "Greenwashing Detection & Claims Verification": "Greenwash Det",
    "General AI & Sustainability Strategy": "General AI",
  };

  function cellColor(score: number): string {
    if (score >= 0.7) return "bg-green-500/80 text-white";
    if (score >= 0.5) return "bg-yellow-500/70 text-white";
    if (score >= 0.3) return "bg-orange-400/70 text-white";
    return "bg-red-400/60 text-white";
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">Capability Matrix — Reality Score Heatmap</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left font-medium text-muted-foreground">Competitor</th>
              {allCategories.map((cat) => (
                <th
                  key={cat}
                  className="p-2 text-center font-medium text-muted-foreground"
                  title={cat}
                >
                  {shortLabels[cat] ?? cat.substring(0, 10)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const categoryMap = new Map(
                row.categories.map((c) => [c.category, c])
              );
              const isEY = row.slug === "ey";

              return (
                <tr
                  key={row.slug}
                  className={cn(isEY && "bg-[#FFE600]/5 font-semibold")}
                >
                  <td className="p-2 whitespace-nowrap">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.brandColor ?? "#888" }}
                    />
                    {row.competitorName}
                    {isEY && <span className="ml-1 text-[10px] text-[#FFE600]">(EY)</span>}
                  </td>
                  {allCategories.map((cat) => {
                    const cell = categoryMap.get(cat);
                    if (!cell) {
                      return (
                        <td key={cat} className="p-2 text-center">
                          <span className="text-muted-foreground/40">—</span>
                        </td>
                      );
                    }
                    return (
                      <td key={cat} className="p-1 text-center">
                        <div
                          className={cn(
                            "mx-auto rounded px-1.5 py-0.5 text-[10px] font-medium",
                            cellColor(cell.avgRealityScore)
                          )}
                          title={`${cell.count} signals, avg reality: ${cell.avgRealityScore.toFixed(2)}`}
                        >
                          {cell.count} ({cell.avgRealityScore.toFixed(1)})
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>Legend:</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-green-500/80" /> High (0.7+)</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-yellow-500/70" /> Medium (0.5+)</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-orange-400/70" /> Low-Med (0.3+)</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-red-400/60" /> Low (&lt;0.3)</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hype vs Reality Quadrant (Scatter Chart)
// ---------------------------------------------------------------------------

function HypeRealityQuadrant({
  data,
}: {
  data: Array<{
    name: string;
    slug: string;
    brandColor: string | null;
    avgRealityScore: number;
    avgMaturity: number;
    signalCount: number;
  }>;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold">Hype vs Reality Quadrant</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        X = Reality Score, Y = Avg Maturity (1=Announced, 4=Scaled), Size = Signal Count
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            dataKey="avgRealityScore"
            name="Reality Score"
            domain={[0, 1]}
            tickFormatter={(v: number) => v.toFixed(1)}
            label={{ value: "Reality Score", position: "bottom", offset: 0, fontSize: 11 }}
            className="text-xs"
          />
          <YAxis
            type="number"
            dataKey="avgMaturity"
            name="Avg Maturity"
            domain={[0.5, 4.5]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(v: number) => {
              const labels: Record<number, string> = {
                1: "Announced",
                2: "Pilot",
                3: "Deployed",
                4: "Scaled",
              };
              return labels[v] ?? "";
            }}
            className="text-xs"
          />
          <ZAxis
            type="number"
            dataKey="signalCount"
            range={[100, 600]}
            name="Signals"
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const d = payload[0]?.payload as (typeof data)[0] | undefined;
              if (!d) return null;
              return (
                <div className="rounded-md border bg-card p-3 text-xs shadow-md">
                  <p className="font-semibold">{d.name}</p>
                  <p>Reality Score: {d.avgRealityScore.toFixed(2)}</p>
                  <p>Avg Maturity: {d.avgMaturity.toFixed(1)}</p>
                  <p>Signals: {d.signalCount}</p>
                </div>
              );
            }}
          />
          <Scatter data={data}>
            {data.map((entry) => (
              <Cell
                key={entry.slug}
                fill={entry.brandColor ?? COMPETITOR_COLORS[entry.slug] ?? "#888"}
                stroke={entry.slug === "ey" ? "#FFE600" : "transparent"}
                strokeWidth={entry.slug === "ey" ? 3 : 0}
              />
            ))}
          </Scatter>

          {/* Quadrant labels */}
          <text x={80} y={30} fontSize={10} fill="#888" textAnchor="middle">
            Overpromisers
          </text>
          <text x={420} y={30} fontSize={10} fill="#888" textAnchor="middle">
            Proven Leaders
          </text>
          <text x={80} y={330} fontSize={10} fill="#888" textAnchor="middle">
            Early Noise
          </text>
          <text x={420} y={330} fontSize={10} fill="#888" textAnchor="middle">
            Quiet Builders
          </text>
        </ScatterChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {data.map((entry) => (
          <span key={entry.slug} className="inline-flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.brandColor ?? COMPETITOR_COLORS[entry.slug] ?? "#888" }}
            />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partnership Tracker (Table)
// ---------------------------------------------------------------------------

function PartnershipTracker({
  data,
}: {
  data: Array<{
    id: string;
    title: string;
    competitorName: string;
    competitorSlug: string;
    brandColor: string | null;
    partnerName: string | null;
    partnerType: string | null;
    category: string | null;
    maturityLevel: string | null;
    realityScore: number | null;
    publishedAt: Date | null;
  }>;
}) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-6 py-4">
        <h3 className="text-sm font-semibold">Partnership Tracker</h3>
        <p className="text-xs text-muted-foreground">
          Technology and industry partnerships in AI + sustainability
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Competitor</th>
              <th className="px-4 py-3 font-medium">Partner</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Maturity</th>
              <th className="px-4 py-3 font-medium">Reality</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: row.brandColor ?? "#888" }}
                  />
                  {row.competitorName}
                </td>
                <td className="px-4 py-3 font-medium">{row.partnerName ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.partnerType ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs" title={row.category ?? ""}>
                  {row.category ? row.category.split(" ")[0] : "—"}
                </td>
                <td className="px-4 py-3">
                  <MaturityBadge level={row.maturityLevel} />
                </td>
                <td className="px-4 py-3">
                  <RealityBadge score={row.realityScore} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {row.publishedAt
                    ? new Date(row.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No partnerships found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EY Comparison Chart (Horizontal Bar)
// ---------------------------------------------------------------------------

function EyComparisonChart({
  data,
}: {
  data: {
    categories: Array<{
      category: string;
      eyScore: number;
      eyCount: number;
      competitorAvgScore: number;
      competitorCount: number;
    }>;
  };
}) {
  const shortLabels: Record<string, string> = {
    "ESG Data Analytics & Reporting": "ESG Data",
    "Climate Modeling & Scenario Analysis": "Climate Model",
    "Supply Chain Traceability & Due Diligence": "Supply Chain",
    "Regulatory Intelligence & Compliance": "Reg Intel",
    "Sustainability Assurance Automation": "Assurance",
    "Carbon Accounting & Emissions Management": "Carbon Acct",
    "Biodiversity & Nature Analytics": "Biodiversity",
    "Sustainable Finance & Investment Screening": "Sust Finance",
    "Greenwashing Detection & Claims Verification": "Greenwash",
    "General AI & Sustainability Strategy": "General AI",
  };

  const chartData = data.categories
    .filter((c) => c.eyCount > 0 || c.competitorCount > 0)
    .map((c) => ({
      category: shortLabels[c.category] ?? c.category.substring(0, 12),
      fullCategory: c.category,
      EY: c.eyScore,
      Competitors: c.competitorAvgScore,
    }));

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold">EY vs Competitors — Reality Score by Category</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Average reality score comparison per AI capability category
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v: number) => v.toFixed(1)}
            className="text-xs"
          />
          <YAxis
            type="category"
            dataKey="category"
            className="text-xs"
            width={75}
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload || payload.length === 0) return null;
              const item = chartData.find((d) => d.category === label);
              return (
                <div className="rounded-md border bg-card p-3 text-xs shadow-md">
                  <p className="font-semibold">{item?.fullCategory ?? label}</p>
                  {payload.map((p) => (
                    <p key={p.name}>
                      {p.name}: {(p.value as number).toFixed(2)}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Bar dataKey="EY" fill="#FFE600" radius={[0, 4, 4, 0]} barSize={12} />
          <Bar dataKey="Competitors" fill="#747480" radius={[0, 4, 4, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-4 rounded bg-[#FFE600]" /> EY
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-4 rounded bg-[#747480]" /> Competitor Avg
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signal Timeline (Stacked Area)
// ---------------------------------------------------------------------------

function SignalTimeline({
  data,
}: {
  data: {
    timeline: Array<{ month: string; [key: string]: string | number }>;
    competitors: Array<{
      slug: string;
      name: string;
      brandColor: string | null;
    }>;
  };
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold">AI Signal Timeline</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Monthly AI positioning signals per competitor
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data.timeline}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            className="text-xs"
            tickFormatter={(v: string) => {
              const [y, m] = v.split("-");
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              return `${months[parseInt(m, 10) - 1]} '${y?.slice(2)}`;
            }}
          />
          <YAxis className="text-xs" />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload || payload.length === 0) return null;
              return (
                <div className="rounded-md border bg-card p-3 text-xs shadow-md">
                  <p className="mb-1 font-semibold">{label}</p>
                  {payload
                    .filter((p) => (p.value as number) > 0)
                    .map((p) => (
                      <p key={p.name} style={{ color: p.color }}>
                        {p.name}: {p.value}
                      </p>
                    ))}
                </div>
              );
            }}
          />
          {data.competitors.map((comp) => (
            <Area
              key={comp.slug}
              type="monotone"
              dataKey={comp.slug}
              name={comp.name}
              stackId="1"
              fill={comp.brandColor ?? COMPETITOR_COLORS[comp.slug] ?? "#888"}
              stroke={comp.brandColor ?? COMPETITOR_COLORS[comp.slug] ?? "#888"}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {data.competitors.map((comp) => (
          <span key={comp.slug} className="inline-flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  comp.brandColor ?? COMPETITOR_COLORS[comp.slug] ?? "#888",
              }}
            />
            {comp.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signals Table (expandable rows)
// ---------------------------------------------------------------------------

function SignalRow({
  signal,
}: {
  signal: {
    id: string;
    title: string;
    sourceUrl: string;
    signalType: string | null;
    aiCapabilityCategory: string | null;
    maturityLevel: string | null;
    realityScore: number | null;
    aiSummary: string | null;
    productName: string | null;
    partnerName: string | null;
    publishedAt: Date | null;
    isSignificant: boolean;
    keyClaimsExtracted: string[];
    namedClients: string[];
    quantitativeMetrics: string[];
    hypeFlagReasons: string[] | unknown;
    competitor: {
      name: string;
      slug: string;
      brandColor: string | null;
    };
  };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={cn(
          "border-b cursor-pointer hover:bg-muted/30",
          signal.isSignificant && "bg-primary/5"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: signal.competitor.brandColor ?? "#888" }}
          />
          {signal.competitor.name}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="line-clamp-1 text-sm">{signal.title}</span>
            {signal.isSignificant && (
              <Zap className="h-3 w-3 shrink-0 text-yellow-500" />
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {signal.signalType ?? "—"}
        </td>
        <td className="px-4 py-3">
          <MaturityBadge level={signal.maturityLevel} />
        </td>
        <td className="px-4 py-3">
          <RealityBadge score={signal.realityScore} />
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {signal.publishedAt
            ? new Date(signal.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })
            : "—"}
        </td>
        <td className="px-4 py-3">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/20">
          <td colSpan={7} className="px-6 py-4">
            <div className="space-y-3 text-sm">
              {signal.aiSummary && (
                <p className="text-muted-foreground">{signal.aiSummary}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs">
                {signal.productName && (
                  <div>
                    <span className="font-medium text-muted-foreground">Product: </span>
                    {signal.productName}
                  </div>
                )}
                {signal.partnerName && (
                  <div>
                    <span className="font-medium text-muted-foreground">Partner: </span>
                    {signal.partnerName}
                  </div>
                )}
                {signal.aiCapabilityCategory && (
                  <div>
                    <span className="font-medium text-muted-foreground">Category: </span>
                    {signal.aiCapabilityCategory}
                  </div>
                )}
              </div>
              {signal.keyClaimsExtracted.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Key Claims:</p>
                  <ul className="list-inside list-disc text-xs text-muted-foreground">
                    {signal.keyClaimsExtracted.map((claim, i) => (
                      <li key={i}>{claim}</li>
                    ))}
                  </ul>
                </div>
              )}
              {signal.namedClients.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">Named Clients: </span>
                  {signal.namedClients.join(", ")}
                </div>
              )}
              {signal.quantitativeMetrics.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">Metrics: </span>
                  {signal.quantitativeMetrics.join("; ")}
                </div>
              )}
              {Array.isArray(signal.hypeFlagReasons) && signal.hypeFlagReasons.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-red-600">Hype Flags: </span>
                  {(signal.hypeFlagReasons as string[]).join("; ")}
                </div>
              )}
              <div>
                <a
                  href={signal.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View Source <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Client Component
// ---------------------------------------------------------------------------

export function AiPositioningDashboardClient() {
  const [activeTab, setActiveTab] = useState<"timeline" | "eyComparison">("timeline");

  const statsQuery = trpc.aiPositioning.getStats.useQuery();
  const matrixQuery = trpc.aiPositioning.getCapabilityMatrix.useQuery();
  const quadrantQuery = trpc.aiPositioning.getHypeQuadrant.useQuery();
  const partnershipsQuery = trpc.aiPositioning.getPartnerships.useQuery();
  const timelineQuery = trpc.aiPositioning.getTimeline.useQuery({ months: 12 });
  const eyComparisonQuery = trpc.aiPositioning.getEyComparison.useQuery();
  const signalsQuery = trpc.aiPositioning.listSignals.useQuery({
    page: 1,
    limit: 20,
    sortBy: "realityScore",
    sortOrder: "desc",
  });

  const stats = statsQuery.data;
  const isLoading =
    statsQuery.isLoading ||
    matrixQuery.isLoading ||
    quadrantQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Brain className="mx-auto h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading AI positioning data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total AI Signals"
          value={stats?.totalSignals ?? 0}
          subtitle={`${stats?.byCompetitor.length ?? 0} competitors tracked`}
          icon={Brain}
        />
        <StatCard
          title="Most Active"
          value={stats?.mostActiveCompetitor?.name ?? "—"}
          subtitle={
            stats?.mostActiveCompetitor
              ? `${stats.mostActiveCompetitor.count} signals`
              : undefined
          }
          icon={Zap}
        />
        <StatCard
          title="Avg Reality Score"
          value={stats?.avgRealityScore?.toFixed(2) ?? "0.00"}
          subtitle="Across all signals"
          icon={TrendingUp}
        />
        <StatCard
          title="Partnerships"
          value={stats?.partnerships ?? 0}
          subtitle="Named technology partnerships"
          icon={Handshake}
        />
      </div>

      {/* Section 2: Capability Matrix */}
      {matrixQuery.data && matrixQuery.data.length > 0 && (
        <CapabilityMatrix data={matrixQuery.data} />
      )}

      {/* Section 3: Hype vs Reality Quadrant + Partnership Tracker */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {quadrantQuery.data && quadrantQuery.data.length > 0 && (
          <HypeRealityQuadrant data={quadrantQuery.data} />
        )}
        {partnershipsQuery.data && (
          <PartnershipTracker data={partnershipsQuery.data} />
        )}
      </div>

      {/* Section 4: Tabs — Timeline + EY Comparison */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("timeline")}
            className={cn(
              "px-6 py-3 text-sm font-medium transition-colors",
              activeTab === "timeline"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Signal Timeline
          </button>
          <button
            onClick={() => setActiveTab("eyComparison")}
            className={cn(
              "px-6 py-3 text-sm font-medium transition-colors",
              activeTab === "eyComparison"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            EY Comparison
          </button>
        </div>
        <div className="p-0">
          {activeTab === "timeline" && timelineQuery.data && (
            <SignalTimeline data={timelineQuery.data} />
          )}
          {activeTab === "eyComparison" && eyComparisonQuery.data && (
            <EyComparisonChart data={eyComparisonQuery.data} />
          )}
        </div>
      </div>

      {/* Section 5: All Signals Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h3 className="text-sm font-semibold">All AI Positioning Signals</h3>
          <p className="text-xs text-muted-foreground">
            Click a row to expand details. Sorted by reality score (highest first).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Competitor</th>
                <th className="px-4 py-3 font-medium">Signal</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Maturity</th>
                <th className="px-4 py-3 font-medium">Reality</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {signalsQuery.data?.items.map((signal) => (
                <SignalRow key={signal.id} signal={signal} />
              ))}
              {(!signalsQuery.data || signalsQuery.data.items.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No AI positioning signals found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {signalsQuery.data && signalsQuery.data.total > 20 && (
          <div className="border-t px-6 py-3 text-xs text-muted-foreground text-center">
            Showing {signalsQuery.data.items.length} of {signalsQuery.data.total} signals
          </div>
        )}
      </div>
    </div>
  );
}
