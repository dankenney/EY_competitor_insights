import { Suspense } from "react";
import { MessageSquare } from "lucide-react";
import { DataChatClient } from "./data-chat-client";

export const metadata = {
  title: "Data Chat | CCaSS Intelligence",
  description:
    "Chat with your competitive intelligence data using AI-powered analysis.",
};

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Chat</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about competitive intelligence data in this platform
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-lg border bg-card">
            <div className="text-sm text-muted-foreground">
              Loading chat...
            </div>
          </div>
        }
      >
        <DataChatClient />
      </Suspense>
    </div>
  );
}
