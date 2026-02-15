import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Scraper Health | CCaSS Intelligence",
  description: "Monitor scraper health and run history.",
};

export default function ScraperHealthPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scraper Health</h1>
          <p className="text-sm text-muted-foreground">
            Monitor data pipeline health and scraper run history
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Scraper health monitoring dashboard with run history, success rates, and alerting is under development for Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
