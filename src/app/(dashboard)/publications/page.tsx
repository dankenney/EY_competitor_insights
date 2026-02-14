import { Suspense } from "react";
import { FileText } from "lucide-react";
import {
  CardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { PublicationsDashboardClient } from "./publications-dashboard-client";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Content Marketing | CCaSS Intelligence",
  description:
    "Track and analyze competitor sustainability content marketing, thought leadership, and publications.",
};

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Trend chart */}
      <ChartSkeleton />

      {/* Heatmap */}
      <ChartSkeleton />

      {/* Table */}
      <TableSkeleton rows={8} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (server component)
// ---------------------------------------------------------------------------

export default function PublicationsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Content Marketing
            </h1>
            <p className="text-sm text-muted-foreground">
              Track competitor sustainability publications, thought leadership,
              and content strategies
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <Suspense fallback={<DashboardSkeleton />}>
        <PublicationsDashboardClient />
      </Suspense>
    </div>
  );
}
