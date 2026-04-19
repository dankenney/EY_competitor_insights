const REVALIDATE_SECRET =
  process.env.REVALIDATE_SECRET ??
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET;

function getAppBaseUrl(): string | null {
  const explicitUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  return null;
}

export async function revalidateAppCache(reason: string): Promise<void> {
  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    console.warn(
      `[revalidate] Skipping cache revalidation for "${reason}" because no app URL is configured`
    );
    return;
  }

  if (!REVALIDATE_SECRET) {
    console.warn(
      `[revalidate] Skipping cache revalidation for "${reason}" because no revalidation secret is configured`
    );
    return;
  }

  try {
    const response = await fetch(new URL("/api/revalidate", baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": REVALIDATE_SECRET,
      },
      body: JSON.stringify({ reason }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const message = await response.text();
      console.warn(
        `[revalidate] Failed to revalidate cache for "${reason}": ${response.status} ${response.statusText} ${message}`
      );
      return;
    }

    console.log(`[revalidate] Cache revalidated after "${reason}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[revalidate] Unable to revalidate cache for "${reason}": ${message}`
    );
  }
}
