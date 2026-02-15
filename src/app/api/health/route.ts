import { NextResponse } from "next/server";

export async function GET() {
  const timestamp = new Date().toISOString();
  let dbStatus = "unknown";

  try {
    // Lazy-import db to avoid crashing if DATABASE_URL is missing at module load
    const { db } = await import("@/server/db");
    await db.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "unavailable";
  }

  // Always return 200 so Railway knows the process is alive.
  // DB connectivity is reported as informational — a missing DB
  // shouldn't prevent the container from passing the healthcheck.
  return NextResponse.json(
    { status: "healthy", database: dbStatus, timestamp },
    { status: 200 }
  );
}
