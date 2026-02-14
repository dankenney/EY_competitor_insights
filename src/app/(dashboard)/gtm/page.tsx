import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "GTM Messaging | CCaSS Intelligence",
  description: "Track competitor website and go-to-market messaging changes.",
};

export default function GtmPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GTM Messaging</h1>
          <p className="text-sm text-muted-foreground">
            Monitor competitor go-to-market messaging and website changes
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            GTM messaging tracking with semantic change detection is under development for Phase 2. This module will use LLM-based diff to identify meaningful positioning shifts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
