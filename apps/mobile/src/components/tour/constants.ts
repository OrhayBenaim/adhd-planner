export type TourStepName =
  | "intro"
  | "createTask"
  | "pickDay"
  | "pickTime"
  | "moodMeter"
  | "aiPick"
  | "completeTask"
  | "celebration";

export type TourStepType = "action" | "button";

export interface TourStepDef {
  name: TourStepName;
  step: number;
  type: TourStepType;
  title: string;
  description: string;
  buttonLabel?: string;
  posthogEvent: string;
}

export const TOUR_STEPS: TourStepDef[] = [
  {
    name: "intro",
    step: 0,
    type: "button",
    title: "Let me show you around",
    description: "It'll take 30 seconds.",
    buttonLabel: "Let's go",
    posthogEvent: "guided_tour_shown",
  },
  {
    name: "createTask",
    step: 1,
    type: "action",
    title: "Add your first task",
    description: "What do you need to get done? Tap below to get started.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "pickDay",
    step: 2,
    type: "action",
    title: "When do you want to do this?",
    description: "Pick a day. We'll use this to plan your schedule and send reminders.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "pickTime",
    step: 3,
    type: "action",
    title: "What time works best?",
    description: "We'll match this to your focus times from onboarding.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "moodMeter",
    step: 4,
    type: "button",
    title: "How are you feeling?",
    description: "Slide to set your energy level. We'll suggest tasks that match how you're feeling right now.",
    buttonLabel: "Got it",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "aiPick",
    step: 5,
    type: "action",
    title: "Your personal task picker",
    description: "Tap here and we'll find the best task for your mood and energy.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "completeTask",
    step: 6,
    type: "action",
    title: "Nice! Now let's crush it",
    description: "When you're done, tap the task to mark it complete and earn XP.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "celebration",
    step: 7,
    type: "button",
    title: "You're ready!",
    description: "That's the core loop. Add tasks, match your mood, and get things done.",
    buttonLabel: "Let's start!",
    posthogEvent: "guided_tour_completed",
  },
];
