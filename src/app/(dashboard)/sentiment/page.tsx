import { TrendingUp, MessageSquare, BarChart3, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Client Sentiment | CCaSS Intelligence",
  description: "Approximate client sentiment from public signals.",
};

const PLANNED_CAPABILITIES = [
  {
    icon: MessageSquare,
    title: "Public Signal Analysis",
    description:
      "Aggregate sentiment from analyst reports, conference mentions, and industry commentary.",
  },
  {
    icon: BarChart3,
    title: "Competitor Perception",
    description:
      "Compare how the market perceives each competitor's sustainability practice and capabilities.",
  },
  {
    icon: Users,
    title: "Client Win/Loss Signals",
    description:
      "Track public engagement announcements and case studies to approximate competitive win rates.",
  },
];

export default function SentimentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Client Sentiment
          </h1>
          <p className="text-sm text-muted-foreground">
            Approximate client sentiment and market perception from public
            signals
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
              Client sentiment analysis will approximate market perception using
              public signals — analyst reports, social media, conference
              mentions, and engagement announcements.
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
