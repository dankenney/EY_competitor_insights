import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { CACHE_TAGS } from "@/server/cache";
import { auth } from "@/server/auth/config";

function hasValidRevalidateSecret(request: NextRequest): boolean {
  const providedSecret = request.headers.get("x-revalidate-secret");
  const acceptedSecrets = [
    process.env.REVALIDATE_SECRET,
    process.env.AUTH_SECRET,
    process.env.NEXTAUTH_SECRET,
  ].filter(Boolean);

  return Boolean(
    providedSecret &&
      acceptedSecrets.some((secret) => secret === providedSecret)
  );
}

/**
 * POST /api/revalidate — Invalidates all dashboard caches.
 * Call this after re-seeding the database or uploading new data.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin && !hasValidRevalidateSecret(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  for (const tag of Object.values(CACHE_TAGS)) {
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ revalidated: true, tags: Object.values(CACHE_TAGS) });
}
