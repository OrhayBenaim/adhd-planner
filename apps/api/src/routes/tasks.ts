import { Router } from "express";
// @ts-ignore — generated after `convex dev` runs in apps/convex
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { convex } from "../convex";
import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";

const router = Router();

async function getSession(req: Parameters<typeof fromNodeHeaders>[0]) {
  return auth.api.getSession({ headers: fromNodeHeaders(req) });
}

// GET /api/tasks — list tasks for authenticated user
router.get("/", async (req, res) => {
  const session = await getSession(req.headers);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const tasks = await convex.query(api.tasks.list, { userId: session.user.id });
  res.json({ data: tasks });
});

// POST /api/tasks — create a task
router.post("/", async (req, res) => {
  const session = await getSession(req.headers);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { title, description, dueDate } = req.body as {
    title: string;
    description?: string;
    dueDate?: string;
  };
  const id = await convex.mutation(api.tasks.create, {
    userId: session.user.id,
    title,
    description,
    dueDate,
  });
  res.status(201).json({ data: { id } });
});

// PATCH /api/tasks/:id/complete
router.patch("/:id/complete", async (req, res) => {
  const session = await getSession(req.headers);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { completed } = req.body as { completed: boolean };
  await convex.mutation(api.tasks.setCompleted, {
    id: req.params.id as any,
    completed,
  });
  res.json({ data: { success: true } });
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  const session = await getSession(req.headers);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await convex.mutation(api.tasks.remove, { id: req.params.id as any });
  res.json({ data: { success: true } });
});

export default router;
