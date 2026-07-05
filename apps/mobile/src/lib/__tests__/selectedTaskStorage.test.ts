import type { Task } from "@adhd-planner/types";
import { resolveSelectedTask, storageKey } from "../selectedTaskStorage";

describe("storageKey", () => {
  it("scopes by userId", () => {
    expect(storageKey("user-a")).toBe("lullio.selectedTaskId.user-a");
  });
});

describe("resolveSelectedTask", () => {
  const tasks: Task[] = [
    {
      _id: "task-1",
      userId: "user1",
      title: "Active",
      difficulty: 50,
      completed: false,
      dueDate: "2026-03-13",
      dueTime: "10:00",
      _creationTime: 0,
    },
    {
      _id: "task-2",
      userId: "user1",
      title: "Done",
      difficulty: 30,
      completed: true,
      dueDate: "2026-03-13",
      dueTime: "12:00",
      _creationTime: 1,
    },
  ];

  it("returns null when taskId is null", () => {
    expect(resolveSelectedTask(tasks, null)).toBeNull();
  });

  it("returns matching incomplete task", () => {
    expect(resolveSelectedTask(tasks, "task-1")?._id).toBe("task-1");
  });

  it("returns null for completed task", () => {
    expect(resolveSelectedTask(tasks, "task-2")).toBeNull();
  });

  it("returns null for missing task", () => {
    expect(resolveSelectedTask(tasks, "missing")).toBeNull();
  });
});
