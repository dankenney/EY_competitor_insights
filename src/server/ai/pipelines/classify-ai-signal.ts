import { db } from "../../db";
import { generateJSON } from "../client";
import { getPrompt } from "../prompts";

interface ScreeningResult {
  relevant: boolean;
  confidence: number;
  reason: string;
}

interface ClassificationResult {
  signalType: string;
  aiCapabilityCategory: string;
  sustainabilityDomain: string;
  productName: string | null;
  partnerName: string | null;
  partnerType: string | null;
  partnerships:
    | { name: string; type: string; depth: string; announced: string }[]
    | null;
  maturityLevel: string;
  evidenceScore: number;
  claimSpecificity: number;
  verifiability: number;
  evidenceIndicators: string[];
  hypeFlagReasons: string[];
  summary: string;
  keyClaimsExtracted: string[];
  namedClients: string[];
  quantitativeMetrics: string[];
  isSignificant: boolean;
  confidence: number;
}

interface AiSignalInput {
  id: string;
  title: string;
  sourceUrl: string;
  publishedAt: Date | null;
  rawContent: string | null;
  competitorId: string;
}

function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export async function classifyAiSignal(
  signal: AiSignalInput
): Promise<void> {
  try {
    const competitor = await db.competitor.findUnique({
      where: { id: signal.competitorId },
      select: { name: true },
    });

    const competitorName = competitor?.name ?? "Unknown";
    const excerpt =
      signal.rawContent?.substring(0, 500) ?? signal.title;
    const fullText =
      signal.rawContent?.substring(0, 4000) ?? signal.title;

    // Step 1: Screen for relevance (must be AI + sustainability)
    const screenPrompt = await getPrompt("screen-ai-signal");

    const screenUserPrompt = fillTemplate(screenPrompt.userTemplate, {
      title: signal.title,
      competitor: competitorName,
      excerpt: excerpt,
    });

    console.log(
      `[classify-ai-signal] Screening signal: "${signal.title}" (${signal.id})`
    );

    const screenResult = await generateJSON<ScreeningResult>(
      screenPrompt.model,
      screenPrompt.systemPrompt,
      screenUserPrompt
    );

    if (!screenResult.relevant || screenResult.confidence < 0.6) {
      console.log(
        `[classify-ai-signal] Signal "${signal.title}" screened out: ` +
          `relevant=${screenResult.relevant}, confidence=${screenResult.confidence}, ` +
          `reason="${screenResult.reason}"`
      );

      await db.aiPositioningSignal.update({
        where: { id: signal.id },
        data: {
          aiClassifiedAt: new Date(),
          confidenceScore: screenResult.confidence,
          aiSummary: `Screened out: ${screenResult.reason}`,
        },
      });

      return;
    }

    // Step 2: Full classification with hype vs reality scoring
    const classifyPrompt = await getPrompt("classify-ai-signal");

    const classifyUserPrompt = fillTemplate(classifyPrompt.userTemplate, {
      competitor: competitorName,
      title: signal.title,
      url: signal.sourceUrl,
      date: signal.publishedAt?.toISOString() ?? "Unknown",
      text: fullText,
    });

    console.log(
      `[classify-ai-signal] Classifying signal: "${signal.title}" (${signal.id})`
    );

    const classification = await generateJSON<ClassificationResult>(
      classifyPrompt.model,
      classifyPrompt.systemPrompt,
      classifyUserPrompt
    );

    // Compute composite reality score: evidence*0.50 + specificity*0.30 + verifiability*0.20
    const realityScore =
      Math.round(
        (classification.evidenceScore * 0.5 +
          classification.claimSpecificity * 0.3 +
          classification.verifiability * 0.2) *
          100
      ) / 100;

    // Step 3: Update signal record
    await db.aiPositioningSignal.update({
      where: { id: signal.id },
      data: {
        signalType: classification.signalType,
        aiCapabilityCategory: classification.aiCapabilityCategory,
        sustainabilityDomain: classification.sustainabilityDomain,
        productName: classification.productName,
        partnerName: classification.partnerName,
        partnerType: classification.partnerType,
        partnerships: classification.partnerships ?? undefined,
        maturityLevel: classification.maturityLevel,
        evidenceScore: classification.evidenceScore,
        claimSpecificity: classification.claimSpecificity,
        verifiability: classification.verifiability,
        realityScore,
        evidenceIndicators: classification.evidenceIndicators ?? [],
        hypeFlagReasons: classification.hypeFlagReasons ?? [],
        aiSummary: classification.summary,
        keyClaimsExtracted: classification.keyClaimsExtracted ?? [],
        namedClients: classification.namedClients ?? [],
        quantitativeMetrics: classification.quantitativeMetrics ?? [],
        isSignificant: classification.isSignificant ?? false,
        confidenceScore: classification.confidence,
        aiClassifiedAt: new Date(),
      },
    });

    console.log(
      `[classify-ai-signal] Successfully classified "${signal.title}": ` +
        `type="${classification.signalType}", ` +
        `maturity="${classification.maturityLevel}", ` +
        `realityScore=${realityScore}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[classify-ai-signal] Error classifying signal ${signal.id} ` +
        `("${signal.title}"): ${message}`
    );
  }
}
