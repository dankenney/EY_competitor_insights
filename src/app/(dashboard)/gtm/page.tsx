import { Target, Sparkles, Globe, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "GTM Messaging | CCaSS Intelligence",
  description: "Track competitor website and go-to-market messaging changes.",
};

const PLANNED_CAPABILITIES = [
  {
    icon: Globe,
    title: "Website Change Detection",
    description:
      "Automated monitoring of competitor sustainability service pages for positioning shifts.",
  },
  {
    icon: Sparkles,
    title: "Semantic Diff Analysis",
    description:
      "LLM-powered change detection that ignores cosmetic updates and surfaces meaningful messaging changes.",
  },
  {
    icon: BarChart3,
    title: "Positioning Trends",
    description:
      "Track how competitors evolve their value propositions across climate, ESG, and sustainability services.",
  },
];

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
        <CardContent className="py-12 px-8">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4 text-xs font-medium">
              Phase 2
            </Badge>
            <h2 className="text-xl font-semibold mb-2">Under Development</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              GTM messaging intelligence will use semantic change detection to
              identify meaningful competitor positioning shifts — filtering out
              cosmetic website updates.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {PLANNED_CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="rounded-lg border border-dashed bg-muted/30 p-4 text-center"
              >
                <cap.icon className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <h3 className="text-sm font-medium mb-1">{cap.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
