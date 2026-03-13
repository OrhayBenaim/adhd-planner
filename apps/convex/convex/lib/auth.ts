import { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

/**
 * Require authenticated user identity. Throws ConvexError if unauthenticated.
 * Returns the userId (identity.subject).
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  return identity.subject;
}
