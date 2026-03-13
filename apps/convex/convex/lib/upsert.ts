import { MutationCtx } from "../_generated/server";

const SETTINGS_DEFAULTS = {
  aiEnabled: true,
  userAiEnabled: true,
  notificationsEnabled: false,
} as const;

/**
 * Get-or-create userSettings, then patch the given fields.
 */
export async function upsertUserSetting(
  ctx: MutationCtx,
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const existing = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, patch);
  } else {
    await ctx.db.insert("userSettings", {
      userId,
      ...SETTINGS_DEFAULTS,
      ...patch,
    });
  }
}
