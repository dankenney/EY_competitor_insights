import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Client Sentiment | CCaSS Intelligence",
  description: "Approximate client sentiment from public signals.",
};

export default function SentimentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Sentiment</h1>
          <p className="text-sm text-muted-foreground">
            Approximate client sentiment and market perception from public signals
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Client sentiment analysis using public signals (analyst reports, social media, conference mentions) is under development for Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
