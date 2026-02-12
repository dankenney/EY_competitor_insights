import { GoogleGenerativeAI } from "@google/generative-ai";
import { withRetry } from "../../../workers/utils/retry";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "[ai-client] GEMINI_API_KEY is not set. AI features will not work."
  );
}

const globalForGemini = globalThis as unknown as {
  geminiClient: GoogleGenerativeAI | undefined;
};

export const geminiClient: GoogleGenerativeAI =
  globalForGemini.geminiClient ??
  new GoogleGenerativeAI(apiKey ?? "missing-api-key");

if (process.env.NODE_ENV !== "production") {
  globalForGemini.geminiClient = geminiClient;
}

export async function generateJSON<T = unknown>(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  return withRetry(
    async () => {
      const generativeModel = geminiClient.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await generativeModel.generateContent(userPrompt);
      const response = result.response;

      const usage = response.usageMetadata;
      if (usage) {
        console.log(
          `[ai-client] Token usage for ${model}: ` +
            `prompt=${usage.promptTokenCount}, ` +
            `completion=${usage.candidatesTokenCount}, ` +
            `total=${usage.totalTokenCount}`
        );
      }

      const text = response.text();

      try {
        return JSON.parse(text) as T;
      } catch {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
          return JSON.parse(jsonMatch[1].trim()) as T;
        }
        throw new Error(
          `Failed to parse JSON response from ${model}: ${text.substring(0, 200)}`
        );
      }
    },
    { maxRetries: 3, baseDelay: 2000, maxDelay: 15000 }
  );
}

export async function generateText(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return withRetry(
    async () => {
      const generativeModel = geminiClient.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
      });

      const result = await generativeModel.generateContent(userPrompt);
      const response = result.response;

      const usage = response.usageMetadata;
      if (usage) {
        console.log(
          `[ai-client] Token usage for ${model}: ` +
            `prompt=${usage.promptTokenCount}, ` +
            `completion=${usage.candidatesTokenCount}, ` +
            `total=${usage.totalTokenCount}`
        );
      }

      return response.text();
    },
    { maxRetries: 3, baseDelay: 2000, maxDelay: 15000 }
  );
}
