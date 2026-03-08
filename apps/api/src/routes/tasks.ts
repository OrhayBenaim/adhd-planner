import { Router } from "express";
import type { Request } from "express";
// @ts-ignore — generated after `convex dev` runs in apps/convex
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { convex } from "../convex";

const router = Router();
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL ?? "";

async function getSession(req: Request) {
  try {
    const res = await fetch(`${CONVEX_SITE_URL}/api/auth/get-session`, {
      headers: { cookie: req.headers.cookie ?? "" },
    });
    if (!res.ok) return null;
    const body = await res.json() as { user?: { id: string } } | null;
    return body?.user ? body : null;
  } catch {
    return null;
  }
}

// GET /api/tasks — list tasks for authenticated user
router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const tasks = await convex.query(api.tasks.list, { userId: session.user.id });
  res.json({ data: tasks });
});

// POST /api/tasks — create a task
router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { title, description, difficulty, dueDate, dueTime } = req.body as {
    title: string;
    description?: string;
    difficulty?: number;
    dueDate?: string;
    dueTime?: string;
  };
  const id = await convex.mutation(api.tasks.create, {
    userId: session.user.id,
    title,
    description,
    difficulty: difficulty ?? 50,
    dueDate,
    dueTime,
  });
  res.status(201).json({ data: { id } });
});

// PATCH /api/tasks/:id/complete
router.patch("/:id/complete", async (req, res) => {
  const session = await getSession(req);
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
  const session = await getSession(req);
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await convex.mutation(api.tasks.remove, { id: req.params.id as any });
  res.json({ data: { success: true } });
});

export default router;
