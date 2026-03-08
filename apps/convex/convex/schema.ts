import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    difficulty: v.number(),
    completed: v.boolean(),
    dueDate: v.optional(v.string()),
    dueTime: v.optional(v.string()),
  }).index("by_user", ["userId"]),
});
