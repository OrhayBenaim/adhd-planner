import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    dueDate: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  users: defineTable({
    externalId: v.string(), // better-auth user ID
    email: v.string(),
    name: v.string(),
  }).index("by_external_id", ["externalId"]),
});
