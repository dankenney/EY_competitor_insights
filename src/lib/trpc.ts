import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/trpc/routers";

/**
 * tRPC React hooks for client-side usage.
 * Provides fully typed query/mutation hooks based on the AppRouter definition.
 *
 * Usage:
 *   import { trpc } from "@/lib/trpc";
 *   const { data } = trpc.health.check.useQuery();
 */
export const trpc = createTRPCReact<AppRouter>();
