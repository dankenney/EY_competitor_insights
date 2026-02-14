import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
            Competitor profiles, comparison dashboards, and strategic positioning
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Competitor profiles with side-by-side comparisons across all intelligence modules are under development for Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
