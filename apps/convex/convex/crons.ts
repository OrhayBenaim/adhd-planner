import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "coach-notifications",
  { hours: 1 },
  internal.coachNotifications.processAllUsers,
);

export default crons;
