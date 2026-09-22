import type { Task } from "@adhd-planner/types";
import { getLocalDateStringDaysAhead, getLocalToday } from "../dateTimeConvert";
import { groupTasksByDue } from "../taskGroups";

function task(id: string, dueDate: string, dueTime = "09:00"): Task {
  return {
    _id: id,
    userId: "u1",
    title: id,
    difficulty: 30,
    completed: false,
    dueDate,
    dueTime,
    _creationTime: 0,
  };
}

describe("groupTasksByDue", () => {
  it("buckets by how soon the task is due, in calendar order", () => {
    const groups = groupTasksByDue([
      task("later", getLocalDateStringDaysAhead(30)),
      task("tomorrow", getLocalDateStringDaysAhead(1)),
      task("overdue", getLocalDateStringDaysAhead(-2)),
      task("week", getLocalDateStringDaysAhead(4)),
      task("today", getLocalToday()),
    ]);

    expect(groups.map((g) => g.label)).toEqual([
      "Overdue",
      "Today",
      "Tomorrow",
      "Later this week",
      "Later",
    ]);
  });

  it("drops empty groups", () => {
    const groups = groupTasksByDue([task("a", getLocalToday())]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Today");
  });

  it("sorts within a group by date then time", () => {
    const groups = groupTasksByDue([
      task("late", getLocalDateStringDaysAhead(5), "18:00"),
      task("early", getLocalDateStringDaysAhead(3), "08:00"),
      task("mid", getLocalDateStringDaysAhead(3), "15:00"),
    ]);

    expect(groups[0].tasks.map((t) => t._id)).toEqual(["early", "mid", "late"]);
  });

  it("returns nothing for an empty list", () => {
    expect(groupTasksByDue([])).toEqual([]);
  });
});
