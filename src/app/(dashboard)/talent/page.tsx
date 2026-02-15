import { Suspense } from "react";
import { Users } from "lucide-react";
import {
  CardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { TalentDashboardClient } from "./talent-dashboard-client";

export const metadata = {
  title: "Talent | CCaSS Intelligence",
  description:
    "Track sustainability talent signals, headcount trends, and practice-level team changes across competitors.",
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

export default function TalentPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Talent</h1>
            <p className="text-sm text-muted-foreground">
              Sustainability talent signals, headcount trends, and practice team
              changes
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <TalentDashboardClient />
      </Suspense>
    </div>
  );
}
