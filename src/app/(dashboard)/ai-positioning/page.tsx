import { Suspense } from "react";
import { Brain } from "lucide-react";
import {
  CardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { AiPositioningDashboardClient } from "./ai-positioning-dashboard-client";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "AI Positioning Intelligence | CCaSS Intelligence",
  description:
    "Track how competitors position their AI capabilities in sustainability. Separate hype from reality.",
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

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (server component)
// ---------------------------------------------------------------------------

export default function AiPositioningPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              AI Positioning Intelligence
            </h1>
            <p className="text-sm text-muted-foreground">
              Track competitor AI capabilities in sustainability — separate hype
              from reality
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <Suspense fallback={<DashboardSkeleton />}>
        <AiPositioningDashboardClient />
      </Suspense>
    </div>
  );
}
