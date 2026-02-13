import { Suspense } from "react";
import { Scale } from "lucide-react";
import {
  CardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { RegulatoryDashboardClient } from "./regulatory-dashboard-client";

export const metadata = {
  title: "Regulatory Tracker | CCaSS Intelligence",
  description:
    "Monitor regulatory changes across US, EU, UK, and APAC jurisdictions affecting sustainability services.",
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
      <TableSkeleton rows={8} />
    </div>
  );
}

export default function RegulatoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Regulatory Tracker
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor regulatory changes across jurisdictions affecting sustainability services
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <RegulatoryDashboardClient />
      </Suspense>
    </div>
  );
}
