import { db } from "../../db";
import { generateJSON } from "../client";
import { getPrompt } from "../prompts";

interface ScreeningResult {
  relevant: boolean;
  confidence: number;
  reason: string;
}

interface ClassificationResult {
  primaryTheme: string;
  secondaryThemes: string[];
  contentType: string;
  keywords: string[];
  frameworksMentioned: string[];
  sectorsMentioned: string[];
  geographiesMentioned: string[];
  targetAudience: string;
  summary: string;
  keyMessagingPoints: string[];
  competitivePositioning: string;
  confidence: number;
}

interface PublicationInput {
  id: string;
  title: string;
  url: string;
  publishedDate: Date | null;
  extractedText: string | null;
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

export async function classifyPublication(
  publication: PublicationInput
): Promise<void> {
  try {
    const competitor = await db.competitor.findUnique({
      where: { id: publication.competitorId },
      select: { name: true },
    });

    const competitorName = competitor?.name ?? "Unknown";
    const excerpt =
      publication.extractedText?.substring(0, 500) ?? publication.title;
    const fullText =
      publication.extractedText?.substring(0, 4000) ?? publication.title;

    // Step 1: Screen for relevance
    const screenPrompt = await getPrompt("screen-publication");

    const screenUserPrompt = fillTemplate(screenPrompt.userTemplate, {
      title: publication.title,
      competitor: competitorName,
      excerpt: excerpt,
    });

    console.log(
      `[classify] Screening publication: "${publication.title}" (${publication.id})`
    );

    const screenResult = await generateJSON<ScreeningResult>(
      screenPrompt.model,
      screenPrompt.systemPrompt,
      screenUserPrompt
    );

    if (!screenResult.relevant || screenResult.confidence < 0.7) {
      console.log(
        `[classify] Publication "${publication.title}" screened out: ` +
          `relevant=${screenResult.relevant}, confidence=${screenResult.confidence}, ` +
          `reason="${screenResult.reason}"`
      );

      await db.publication.update({
        where: { id: publication.id },
        data: {
          aiClassifiedAt: new Date(),
          confidenceScore: screenResult.confidence,
          aiSummary: `Screened out: ${screenResult.reason}`,
        },
      });

      return;
    }

    // Step 2: Full classification
    const classifyPrompt = await getPrompt("classify-publication");

    const classifyUserPrompt = fillTemplate(classifyPrompt.userTemplate, {
      competitor: competitorName,
      title: publication.title,
      date: publication.publishedDate?.toISOString() ?? "Unknown",
      url: publication.url,
      text: fullText,
    });

    console.log(
      `[classify] Classifying publication: "${publication.title}" (${publication.id})`
    );

    const classification = await generateJSON<ClassificationResult>(
      classifyPrompt.model,
      classifyPrompt.systemPrompt,
      classifyUserPrompt
    );

    // Step 3: Update publication record
    await db.publication.update({
      where: { id: publication.id },
      data: {
        primaryTheme: classification.primaryTheme,
        secondaryThemes: classification.secondaryThemes ?? [],
        contentType: classification.contentType,
        keywords: classification.keywords ?? [],
        frameworksMentioned: classification.frameworksMentioned ?? [],
        sectorsMentioned: classification.sectorsMentioned ?? [],
        geographiesMentioned: classification.geographiesMentioned ?? [],
        targetAudience: classification.targetAudience,
        aiSummary: classification.summary,
        keyMessagingPoints: classification.keyMessagingPoints ?? [],
        competitivePositioningNotes:
          classification.competitivePositioning ?? null,
        confidenceScore: classification.confidence,
        aiClassifiedAt: new Date(),
      },
    });

    console.log(
      `[classify] Successfully classified "${publication.title}": ` +
        `theme="${classification.primaryTheme}", ` +
        `confidence=${classification.confidence}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[classify] Error classifying publication ${publication.id} ` +
        `("${publication.title}"): ${message}`
    );
  }
}
