import { Download, FileText, Presentation, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Reports | CCaSS Intelligence",
  description: "Generate and download executive intelligence reports.",
};

const PLANNED_CAPABILITIES = [
  {
    icon: Presentation,
    title: "Executive PPTX Briefing",
    description:
      "Auto-generated quarterly PowerPoint using EY-branded templates with the latest intelligence data.",
  },
  {
    icon: FileText,
    title: "PDF Summary Reports",
    description:
      "Concise PDF exports with competitor comparisons, regulatory highlights, and key insights.",
  },
  {
    icon: Calendar,
    title: "Scheduled Distribution",
    description:
      "Automated monthly and quarterly report generation delivered directly to leadership.",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and export executive intelligence briefings
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
              Template-based executive report generation will replace the
              manually-produced quarterly PowerPoint with auto-generated
              briefings from live intelligence data.
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
