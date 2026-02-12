import { db } from "../../db";

interface CachedPrompt {
  slug: string;
  systemPrompt: string;
  userTemplate: string;
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat: string | null;
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const promptCache = new Map<string, CachedPrompt>();

export interface LoadedPrompt {
  slug: string;
  systemPrompt: string;
  userTemplate: string;
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat: string | null;
}

export async function getPrompt(slug: string): Promise<LoadedPrompt> {
  const cached = promptCache.get(slug);
  const now = Date.now();

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return {
      slug: cached.slug,
      systemPrompt: cached.systemPrompt,
      userTemplate: cached.userTemplate,
      model: cached.model,
      temperature: cached.temperature,
      maxTokens: cached.maxTokens,
      responseFormat: cached.responseFormat,
    };
  }

  const prompt = await db.aiPrompt.findUnique({
    where: { slug },
  });

  if (!prompt) {
    throw new Error(
      `AI prompt with slug "${slug}" not found in database. ` +
        `Please ensure the prompt has been seeded. Run: npm run db:seed`
    );
  }

  if (!prompt.isActive) {
    throw new Error(
      `AI prompt "${slug}" exists but is marked as inactive. ` +
        `Enable it in the admin panel or database.`
    );
  }

  const entry: CachedPrompt = {
    slug: prompt.slug,
    systemPrompt: prompt.systemPrompt,
    userTemplate: prompt.userTemplate,
    model: prompt.model,
    temperature: prompt.temperature,
    maxTokens: prompt.maxTokens,
    responseFormat: prompt.responseFormat,
    cachedAt: now,
  };

  promptCache.set(slug, entry);

  console.log(`[prompts] Loaded prompt "${slug}" (v${prompt.version})`);

  return {
    slug: entry.slug,
    systemPrompt: entry.systemPrompt,
    userTemplate: entry.userTemplate,
    model: entry.model,
    temperature: entry.temperature,
    maxTokens: entry.maxTokens,
    responseFormat: entry.responseFormat,
  };
}

export function clearPromptCache(): void {
  promptCache.clear();
}
