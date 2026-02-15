import { createTRPCRouter, publicProcedure } from "../trpc";
import { publicationsRouter } from "./publications";
import { dashboardRouter } from "./dashboard";
import { regulatoryRouter } from "./regulatory";
import { headcountRouter } from "./headcount";
import { talentSignalsRouter } from "./talent-signals";
import { aiPositioningRouter } from "./ai-positioning";
import { chatRouter } from "./chat";

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
  regulatory: regulatoryRouter,
  headcount: headcountRouter,
  talentSignals: talentSignalsRouter,
  aiPositioning: aiPositioningRouter,
  chat: chatRouter,
});

/**
 * Type definition of the full API - used on the client side
 * for end-to-end type safety.
 */
export type AppRouter = typeof appRouter;
