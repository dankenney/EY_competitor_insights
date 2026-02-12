import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "@/server/db";
import { auth } from "@/server/auth/config";
import type { PrismaClient } from "@/generated/prisma";
import type { Session } from "next-auth";

/**
 * Context available to every tRPC procedure.
 */
export interface TRPCContext {
  db: PrismaClient;
  session: Session | null;
}

/**
 * Creates the tRPC context for each incoming request.
 * Called by the API route handler.
 */
export async function createTRPCContext(): Promise<TRPCContext> {
  const session = await auth();

  return {
    db,
    session,
  };
}

/**
 * Initialize tRPC with superjson transformer for rich type serialization.
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Router and procedure helpers.
 */
export const createTRPCRouter = t.router;
export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public (unauthenticated) procedure.
 * Any client can call these without being signed in.
 */
export const publicProcedure = t.procedure;

/**
 * Middleware that enforces authentication.
 * Throws UNAUTHORIZED if no valid session exists.
 */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    });
  }

  return next({
    ctx: {
      // Override context with guaranteed non-null session
      session: ctx.session,
    },
  });
});

/**
 * Protected (authenticated) procedure.
 * Requires a valid session.
 */
export const protectedProcedure = t.procedure.use(enforceAuth);

/**
 * Middleware that enforces ADMIN role.
 * Throws FORBIDDEN if the user is not an ADMIN.
 */
const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    });
  }

  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an administrator to access this resource.",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

/**
 * Admin procedure.
 * Requires a valid session with the ADMIN role.
 */
export const adminProcedure = t.procedure.use(enforceAdmin);
