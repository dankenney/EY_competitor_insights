import { createTRPCRouter, publicProcedure } from "../trpc";
import { publicationsRouter } from "./publications";
import { dashboardRouter } from "./dashboard";

/**
 * Health check router - verifies the API is operational.
 */
const healthRouter = createTRPCRouter({
  check: publicProcedure.query(() => {
    return { status: "ok" as const };
  }),
});

/**
 * Root application router.
 * All sub-routers are merged here.
 */
export const appRouter = createTRPCRouter({
  health: healthRouter,
  publications: publicationsRouter,
  dashboard: dashboardRouter,
});

/**
 * Type definition of the full API - used on the client side
 * for end-to-end type safety.
 */
export type AppRouter = typeof appRouter;
