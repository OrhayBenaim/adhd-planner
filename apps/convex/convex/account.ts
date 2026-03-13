import { mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { deleteAllUserData } from "./lib/deleteUserData";

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    await deleteAllUserData(ctx, userId);
  },
});
