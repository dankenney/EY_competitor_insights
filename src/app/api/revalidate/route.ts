import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CACHE_TAGS } from "@/server/cache";

/**
 * POST /api/revalidate — Invalidates all dashboard caches.
 * Call this after re-seeding the database or uploading new data.
 */
export async function POST() {
  for (const tag of Object.values(CACHE_TAGS)) {
    revalidateTag(tag, "max");
  }
  return NextResponse.json({ revalidated: true, tags: Object.values(CACHE_TAGS) });
}
