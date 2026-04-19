/**
 * Verifies external URLs referenced in prisma/seed.ts.
 *
 * Usage:
 *   npx tsx scripts/verify-seed-urls.ts
 */

import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const SEED_PATH = new URL("../prisma/seed.ts", import.meta.url);
const CONCURRENCY = 4;
const TIMEOUT_MS = 30_000;

const BROWSER_REQUIRED_HOSTS = new Set([
  "www.pwc.com",
  "www.wsp.com",
  "tnfd.global",
  "www.mckinsey.com",
]);

type VerificationResult = {
  url: string;
  ok: boolean;
  status: number | "ERROR";
  finalUrl: string | null;
  redirected: boolean;
  browserRequired: boolean;
  title: string | null;
  error?: string;
};

function extractUrls(content: string): string[] {
  return [
    ...new Set(
      [...content.matchAll(/https?:\/\/[^\s"'`]+/g)].map((match) => match[0])
    ),
  ];
}

async function verifyUrl(url: string): Promise<VerificationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; CodexSeedUrlAudit/1.0; +https://openai.com)",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });

    const html = await response.text();
    const hostname = new URL(url).hostname;

    return {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      redirected: response.url !== url,
      browserRequired:
        response.status === 403 && BROWSER_REQUIRED_HOSTS.has(hostname),
      title: html.match(/<title[^>]*>([^<]+)/i)?.[1] ?? null,
    };
  } catch (error) {
    const hostname = new URL(url).hostname;
    const message = error instanceof Error ? error.message : String(error);

    return {
      url,
      ok: false,
      status: "ERROR",
      finalUrl: null,
      redirected: false,
      browserRequired:
        BROWSER_REQUIRED_HOSTS.has(hostname) &&
        /aborted|timed out|timeout/i.test(message),
      title: null,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
    await delay(75);
  }
}

async function main(): Promise<void> {
  const content = await readFile(SEED_PATH, "utf8");
  const urls = extractUrls(content);
  const results: VerificationResult[] = [];
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < urls.length) {
      const nextIndex = currentIndex++;
      const url = urls[nextIndex];
      const result = await verifyUrl(url);
      results.push(result);
      console.log(`[${results.length}/${urls.length}] ${url} -> ${result.status}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const broken = results.filter(
    (result) => !result.ok && !result.browserRequired
  );
  const browserRequired = results.filter((result) => result.browserRequired);
  const redirects = results.filter((result) => result.redirected);

  console.log("\nSummary");
  console.log(`  Total URLs checked: ${results.length}`);
  console.log(`  Redirects: ${redirects.length}`);
  console.log(`  Browser-required pages: ${browserRequired.length}`);
  console.log(`  Broken or timed out: ${broken.length}`);

  if (redirects.length > 0) {
    console.log("\nRedirects");
    for (const result of redirects) {
      console.log(`  ${result.url}`);
      console.log(`    -> ${result.finalUrl}`);
    }
  }

  if (browserRequired.length > 0) {
    console.log("\nBrowser-required");
    for (const result of browserRequired) {
      console.log(`  ${result.url} (${result.status})`);
    }
  }

  if (broken.length > 0) {
    console.log("\nBroken");
    for (const result of broken) {
      console.log(`  ${result.url} (${result.status})`);
      if (result.error) {
        console.log(`    ${result.error}`);
      }
    }
    process.exitCode = 1;
  }
}

void main();
