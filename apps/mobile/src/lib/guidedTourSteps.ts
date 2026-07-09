import type { TourStepEvent } from "./analytics";

export type TourStepName =
  | "intro"
  | "createTask"
  | "pickDay"
  | "pickTime"
  | "moodMeter"
  | "aiPick"
  | "completeTask"
  | "celebration"
  | "saveProgress";

export type TourStepType = "action" | "button";

export interface TourStepDef {
  name: TourStepName;
  step: number;
  type: TourStepType;
  title: string;
  description: string;
  buttonLabel?: string;
  posthogEvent: TourStepEvent;
}

export const TOUR_STEPS: TourStepDef[] = [
  {
    name: "intro",
    step: 0,
    type: "button",
    title: "Let's set up your first task together",
    description: "It only takes 30 seconds, and then this place is all yours.",
    buttonLabel: "Let's go",
    posthogEvent: "guided_tour_shown",
  },
  {
    name: "createTask",
    step: 1,
    type: "action",
    title: "Add your first task",
    description: "Tap the + button to add something you need to get done. Anything counts — big or tiny.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "pickDay",
    step: 2,
    type: "action",
    title: "When do you want to do this?",
    description: "Pick a day. I'll use this to plan your schedule and send reminders.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "pickTime",
    step: 3,
    type: "action",
    title: "What time works best?",
    description: "I'll match this to the focus times you told me about.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "moodMeter",
    step: 4,
    type: "button",
    title: "How are you feeling?",
    description: "Slide to set your energy level. I'll suggest tasks that match how you're feeling right now.",
    buttonLabel: "Got it",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "aiPick",
    step: 5,
    type: "action",
    title: "Your personal task picker",
    description: "Tap the sparkles and I'll fetch the best task for your mood and energy.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "completeTask",
    step: 6,
    type: "action",
    title: "Nice! Now let's crush it",
    description: "When you're done, tap Complete on the task to earn your first XP.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "celebration",
    step: 7,
    type: "button",
    title: "You did it!",
    description: "That's the whole loop. Add tasks, match your mood, and get things done.",
    buttonLabel: "Let's start!",
    posthogEvent: "guided_tour_completed",
  },
  {
    name: "saveProgress",
    step: 8,
    type: "button",
    title: "Save your progress",
    description: "Link an account so your tasks and XP are safe across devices.",
    posthogEvent: "onboarding_save_progress_shown",
  },
];

/** Number of user-facing numbered steps (createTask..completeTask). */
export const VISIBLE_TOUR_STEP_COUNT = 6;

export function tourStepAt(index: number): TourStepDef {
  const step = TOUR_STEPS[index];
  if (!step) {
    throw new Error(`Invalid tour step index: ${index}`);
  }
  return step;
}

export function tourStepIndexFor(name: TourStepName): number {
  const index = TOUR_STEPS.findIndex((step) => step.name === name);
  if (index < 0) {
    throw new Error(`Unknown tour step: ${name}`);
  }
  return index;
}
