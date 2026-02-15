import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Intelligence Q&A | CCaSS Intelligence",
  description: "Chat-based intelligence queries with agentic RAG.",
};

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intelligence Q&A</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about competitive intelligence using AI-powered analysis
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Agentic RAG-powered chat for querying competitive intelligence data is under development. This will use Gemini Pro with function calling to search across all data modules.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
