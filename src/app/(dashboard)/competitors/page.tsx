import { Users } from "lucide-react";
import { CompetitorsClient } from "./competitors-client";

export const metadata = {
  title: "Competitors | CCaSS Intelligence",
  description: "Competitor profiles and comparison dashboard.",
};

export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Competitors</h1>
          <p className="text-sm text-muted-foreground">
            Competitor profiles, headcount comparison, and strategic positioning
          </p>
        </div>
      </div>
      <CompetitorsClient />
    </div>
  );
}
