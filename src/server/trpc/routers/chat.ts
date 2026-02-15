import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { generateText } from "@/server/ai/client";
import { AI_MODELS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Pricing (Gemini 2.5 Pro per Google's published pricing)
// ---------------------------------------------------------------------------

const PRICING = {
  model: AI_MODELS.chat,
  inputPricePer1k: 0.00125, // $1.25 per 1M input tokens
  outputPricePer1k: 0.01, // $10 per 1M output tokens
} as const;

function estimateCost(promptTokens: number, completionTokens: number) {
  return (
    (promptTokens / 1000) * PRICING.inputPricePer1k +
    (completionTokens / 1000) * PRICING.outputPricePer1k
  );
}

// ---------------------------------------------------------------------------
// System prompt — restricts the model to only answer about in-app data
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a data analyst assistant for the CCaSS (Climate Change and Sustainability Services) Competitive Intelligence platform at EY. You help senior leaders understand competitive intelligence data.

IMPORTANT RULES:
1. You may ONLY answer questions about data that exists in this application: competitor publications, regulatory events, talent signals, headcount data, AI positioning signals, and competitor profiles.
2. If a user asks about topics outside of this application's data scope, politely decline and explain you can only help with competitive intelligence data available in the platform.
3. Always be concise and executive-friendly in your responses.
4. When referencing data, mention which module it comes from (e.g., "Based on talent signals data..." or "According to publications data...").
5. The competitors tracked are: EY, KPMG, PwC, Deloitte, ERM, WSP, Bureau Veritas, McKinsey, BCG, and Accenture.
6. Format responses with markdown for readability.
7. If you don't have enough context to answer accurately, say so rather than guessing.`;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const chatRouter = createTRPCRouter({
  /** List the current user's chat sessions (most recent first). */
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.chatSession.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
  }),

  /** Get a full session with all messages. */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.chatSession.findFirst({
        where: { id: input.sessionId, userId: ctx.session.user.id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat session not found.",
        });
      }

      return session;
    }),

  /** Send a message and get a Gemini response. */
  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        content: z.string().min(1).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // ---------------------------------------------------------------
      // 1. Create or fetch session
      // ---------------------------------------------------------------
      let sessionId = input.sessionId;

      if (!sessionId) {
        const newSession = await ctx.db.chatSession.create({
          data: {
            userId: ctx.session.user.id,
            title: input.content.slice(0, 80),
          },
        });
        sessionId = newSession.id;
      } else {
        // Verify ownership
        const existing = await ctx.db.chatSession.findFirst({
          where: { id: sessionId, userId: ctx.session.user.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Chat session not found.",
          });
        }
      }

      // ---------------------------------------------------------------
      // 2. Store user message
      // ---------------------------------------------------------------
      await ctx.db.chatMessage.create({
        data: {
          sessionId,
          role: "user",
          content: input.content,
        },
      });

      // ---------------------------------------------------------------
      // 3. Build context from app data
      // ---------------------------------------------------------------
      const [
        recentPublications,
        recentRegulatory,
        talentSignals,
        headcountData,
        aiSignals,
        competitors,
      ] = await Promise.all([
        ctx.db.publication.findMany({
          take: 20,
          orderBy: { publishedDate: "desc" },
          select: {
            title: true,
            publishedDate: true,
            aiSummary: true,
            primaryTheme: true,
            secondaryThemes: true,
            competitor: { select: { name: true } },
          },
        }),
        ctx.db.regulatoryEvent.findMany({
          take: 15,
          orderBy: { publishedAt: "desc" },
          select: {
            title: true,
            geography: true,
            impactLevel: true,
            aiSummary: true,
            publishedAt: true,
            frameworksAffected: true,
          },
        }),
        ctx.db.layoffEvent.findMany({
          take: 15,
          orderBy: { eventDate: "desc" },
          select: {
            company: true,
            eventType: true,
            eventDate: true,
            headcountAffected: true,
            division: true,
            geography: true,
            aiSummary: true,
          },
        }),
        ctx.db.headcountSnapshot.findMany({
          take: 20,
          orderBy: { snapshotDate: "desc" },
          select: {
            snapshotDate: true,
            totalSustainabilityHeadcount: true,
            pctChangeVsPrior: true,
            competitor: { select: { name: true } },
          },
        }),
        ctx.db.aiPositioningSignal.findMany({
          take: 15,
          orderBy: { discoveredAt: "desc" },
          select: {
            title: true,
            signalType: true,
            aiCapabilityCategory: true,
            maturityLevel: true,
            aiSummary: true,
            competitor: { select: { name: true } },
          },
        }),
        ctx.db.competitor.findMany({
          select: {
            name: true,
            category: true,
            _count: {
              select: {
                publications: true,
                headcountRecords: true,
                layoffEvents: true,
              },
            },
          },
        }),
      ]);

      const dataContext = `
## Available Data Context

### Competitors Tracked (${competitors.length})
${competitors.map((c) => `- ${c.name} (${c.category}) — ${c._count.publications} publications, ${c._count.headcountRecords} headcount snapshots, ${c._count.layoffEvents} talent signals`).join("\n")}

### Recent Publications (${recentPublications.length} most recent)
${recentPublications.map((p) => `- [${p.competitor?.name}] "${p.title}" (${p.publishedDate?.toISOString().split("T")[0] ?? "N/A"}) — Theme: ${p.primaryTheme ?? "N/A"}${p.secondaryThemes.length > 0 ? `, ${p.secondaryThemes.join(", ")}` : ""}${p.aiSummary ? ` — ${p.aiSummary.slice(0, 150)}` : ""}`).join("\n")}

### Regulatory Events (${recentRegulatory.length} most recent)
${recentRegulatory.map((r) => `- "${r.title}" (${r.geography ?? "Global"}, Impact: ${r.impactLevel ?? "N/A"}, Published: ${r.publishedAt?.toISOString().split("T")[0] ?? "TBD"}) — Frameworks: ${r.frameworksAffected.join(", ") || "N/A"}${r.aiSummary ? ` — ${r.aiSummary.slice(0, 150)}` : ""}`).join("\n")}

### Talent Signals (${talentSignals.length} most recent)
${talentSignals.map((t) => `- [${t.company}] ${t.eventType ?? "Event"} (${t.eventDate?.toISOString().split("T")[0] ?? "N/A"}) — ${t.division ?? ""}${t.headcountAffected ? `, ${t.headcountAffected} affected` : ""}${t.aiSummary ? ` — ${t.aiSummary.slice(0, 150)}` : ""}`).join("\n")}

### Headcount Snapshots (${headcountData.length} most recent)
${headcountData.map((h) => `- [${h.competitor?.name}] ${h.snapshotDate.toISOString().split("T")[0]} — Total: ${h.totalSustainabilityHeadcount?.toLocaleString() ?? "N/A"}${h.pctChangeVsPrior ? `, Change: ${h.pctChangeVsPrior > 0 ? "+" : ""}${h.pctChangeVsPrior.toFixed(1)}%` : ""}`).join("\n")}

### AI Positioning Signals (${aiSignals.length} most recent)
${aiSignals.map((a) => `- [${a.competitor?.name}] "${a.title}" (${a.signalType ?? "Signal"}) — Category: ${a.aiCapabilityCategory ?? "N/A"}, Maturity: ${a.maturityLevel ?? "N/A"}${a.aiSummary ? ` — ${a.aiSummary.slice(0, 150)}` : ""}`).join("\n")}
`.trim();

      // ---------------------------------------------------------------
      // 4. Get conversation history for this session
      // ---------------------------------------------------------------
      const history = await ctx.db.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      });

      // Build the full prompt with history
      const conversationHistory = history
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");

      const userPrompt = `${dataContext}

## Conversation History
${conversationHistory}

Please answer the user's latest question based ONLY on the data context above. If the question is outside the scope of this application's data, politely decline.`;

      // ---------------------------------------------------------------
      // 5. Call Gemini
      // ---------------------------------------------------------------
      let responseText: string;
      let promptTokens = 0;
      let completionTokens = 0;

      try {
        // We use generateText but need token counts. The generateText helper
        // logs tokens but doesn't return them. We'll estimate from character counts.
        responseText = await generateText(
          AI_MODELS.chat,
          SYSTEM_PROMPT,
          userPrompt
        );

        // Rough token estimate: ~4 chars per token for English
        promptTokens = Math.ceil(
          (SYSTEM_PROMPT.length + userPrompt.length) / 4
        );
        completionTokens = Math.ceil(responseText.length / 4);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? `AI generation failed: ${err.message}`
              : "AI generation failed",
        });
      }

      const cost = estimateCost(promptTokens, completionTokens);

      // ---------------------------------------------------------------
      // 6. Store assistant message
      // ---------------------------------------------------------------
      await ctx.db.chatMessage.create({
        data: {
          sessionId,
          role: "assistant",
          content: responseText,
          sourcesUsed: {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            estimatedCost: Math.round(cost * 1_000_000) / 1_000_000, // 6 decimal precision
            model: AI_MODELS.chat,
          },
        },
      });

      // Update session title from first message if needed
      if (!input.sessionId) {
        await ctx.db.chatSession.update({
          where: { id: sessionId },
          data: { title: input.content.slice(0, 80) },
        });
      }

      return {
        sessionId,
        response: responseText,
        tokenUsage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          estimatedCost: Math.round(cost * 1_000_000) / 1_000_000,
          model: AI_MODELS.chat,
        },
      };
    }),

  /** Delete a chat session. */
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.chatSession.findFirst({
        where: { id: input.sessionId, userId: ctx.session.user.id },
      });
      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat session not found.",
        });
      }
      await ctx.db.chatSession.delete({ where: { id: input.sessionId } });
      return { success: true };
    }),
});
