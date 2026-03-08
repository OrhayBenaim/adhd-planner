import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    difficulty: v.number(),
    completed: v.boolean(),
    dueDate: v.string(),
    dueTime: v.string(),
  }).index("by_user", ["userId"]),

  userSettings: defineTable({
    userId: v.string(),
    aiEnabled: v.boolean(),
  }).index("by_user", ["userId"]),

  userProgress: defineTable({
    userId: v.string(),
    level: v.number(),
    points: v.number(),
    pointsToNextLevel: v.number(),
  }).index("by_user", ["userId"]),
});
