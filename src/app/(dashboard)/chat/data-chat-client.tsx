"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  Bot,
  User,
  Info,
  Coins,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: Date | string;
  sourcesUsed?: TokenUsage | null;
}

// ---------------------------------------------------------------------------
// Token usage badge
// ---------------------------------------------------------------------------

function TokenBadge({ usage }: { usage: TokenUsage }) {
  const costStr =
    usage.estimatedCost < 0.01
      ? `$${usage.estimatedCost.toFixed(4)}`
      : `$${usage.estimatedCost.toFixed(2)}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
            <Coins className="h-3 w-3" />
            <span>{usage.totalTokens.toLocaleString()} tokens</span>
            <span className="text-muted-foreground/60">|</span>
            <span className="font-medium">{costStr}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <div>Model: {usage.model}</div>
            <div>Input: {usage.promptTokens.toLocaleString()} tokens</div>
            <div>Output: {usage.completionTokens.toLocaleString()} tokens</div>
            <div>Estimated cost: {costStr}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Chat message component
// ---------------------------------------------------------------------------

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const tokenUsage = message.sourcesUsed as TokenUsage | null;

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {tokenUsage && <TokenBadge usage={tokenUsage} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DataChatClient() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // tRPC
  const utils = trpc.useUtils();
  const sessionsQuery = trpc.chat.listSessions.useQuery();
  const sessionQuery = trpc.chat.getSession.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId }
  );
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      if (!activeSessionId) {
        setActiveSessionId(data.sessionId);
      }
      utils.chat.getSession.invalidate({ sessionId: data.sessionId });
      utils.chat.listSessions.invalidate();
    },
  });
  const deleteSession = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      if (activeSessionId) {
        setActiveSessionId(null);
      }
      utils.chat.listSessions.invalidate();
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionQuery.data?.messages]);

  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
    },
    []
  );

  const handleSend = useCallback(() => {
    const content = inputValue.trim();
    if (!content || sendMessage.isPending) return;

    sendMessage.mutate({
      sessionId: activeSessionId ?? undefined,
      content,
    });

    setInputValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [inputValue, activeSessionId, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setInputValue("");
  }, []);

  const messages = sessionQuery.data?.messages ?? [];

  // Compute session-level cost totals
  const sessionCost = messages.reduce((acc, m) => {
    const usage = m.sourcesUsed as TokenUsage | null;
    if (usage) {
      return {
        totalTokens: acc.totalTokens + usage.totalTokens,
        totalCost: acc.totalCost + usage.estimatedCost,
      };
    }
    return acc;
  }, { totalTokens: 0, totalCost: 0 });

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Session sidebar */}
      <div className="hidden w-64 shrink-0 flex-col gap-2 md:flex">
        <Button
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {sessionsQuery.data?.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
                activeSessionId === session.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => setActiveSessionId(session.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">
                {session.title || "Untitled"}
              </span>
              <button
                className="hidden shrink-0 rounded p-0.5 text-muted-foreground/50 hover:text-destructive group-hover:block"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession.mutate({ sessionId: session.id });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {sessionsQuery.data?.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              No conversations yet
            </p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {activeSessionId && sessionQuery.data?.title
                ? sessionQuery.data.title
                : "New Conversation"}
            </span>
          </div>
          {sessionCost.totalTokens > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-3 w-3" />
              <span>
                Session: {sessionCost.totalTokens.toLocaleString()} tokens |{" "}
                {sessionCost.totalCost < 0.01
                  ? `$${sessionCost.totalCost.toFixed(4)}`
                  : `$${sessionCost.totalCost.toFixed(2)}`}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {messages.length === 0 && !sendMessage.isPending && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Data Chat</h3>
              <p className="max-w-sm text-sm text-muted-foreground mb-6">
                Ask questions about competitive intelligence data in this
                platform. Powered by Gemini 2.5 Pro.
              </p>
              <Card className="max-w-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4" />
                    Try asking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    "Which competitor published the most sustainability content recently?",
                    "What are the key regulatory events affecting CSRD compliance?",
                    "Compare headcount trends across Big Four sustainability practices",
                    "What talent signals indicate practice restructuring?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      className="w-full rounded-md border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() => {
                        setInputValue(suggestion);
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg as Message} />
          ))}

          {sendMessage.isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Analyzing data...
                </span>
              </div>
            </div>
          )}

          {sendMessage.isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {sendMessage.error.message}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about competitive intelligence data..."
                className="w-full resize-none rounded-lg border bg-background px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                rows={1}
                disabled={sendMessage.isPending}
              />
            </div>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessage.isPending}
              className="h-10 w-10 shrink-0"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Powered by Gemini 2.5 Pro. Only answers from in-app data.
            </span>
            <span>Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
