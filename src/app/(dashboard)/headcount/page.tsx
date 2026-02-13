import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import {
  CardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { HeadcountDashboardClient } from "./headcount-dashboard-client";

export const metadata = {
  title: "Competitor Headcount | CCaSS Intelligence",
  description:
    "Compare sustainability headcount across competitors with regional breakdowns.",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <ChartSkeleton />
      <TableSkeleton rows={10} />
    </div>
  );
}

export default function HeadcountPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Competitor Headcount
            </h1>
            <p className="text-sm text-muted-foreground">
              Sustainability practice headcount comparison across competitors
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <HeadcountDashboardClient />
      </Suspense>
    </div>
  );
}
