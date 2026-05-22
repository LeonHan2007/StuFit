import type { PlanTemplate } from "./types";

export const fullBodyTemplate: PlanTemplate = {
  name: "Full Body",
  days: [
    {
      dayIndex: 1,
      label: "Full Body A",
      exercises: [
        { slug: "barbell-squat" },
        { slug: "barbell-bench-press" },
        { slug: "barbell-row" },
        { slug: "overhead-press" },
        { slug: "plank" },
      ],
    },
    {
      dayIndex: 2,
      label: "Full Body B",
      exercises: [
        { slug: "romanian-deadlift" },
        { slug: "db-bench-press" },
        { slug: "pull-up" },
        { slug: "dumbbell-shoulder-press" },
        { slug: "hanging-leg-raise" },
      ],
    },
    {
      dayIndex: 3,
      label: "Full Body C",
      exercises: [
        { slug: "goblet-squat" },
        { slug: "incline-dumbbell-press" },
        { slug: "seated-cable-row" },
        { slug: "lateral-raise" },
        { slug: "cable-crunch" },
      ],
    },
  ],
};

export const fullBodyHomeTemplate: PlanTemplate = {
  name: "Full Body (Home)",
  days: [
    {
      dayIndex: 1,
      label: "Full Body A",
      exercises: [
        { slug: "goblet-squat" },
        { slug: "push-up" },
        { slug: "inverted-row" },
        { slug: "pike-push-up" },
        { slug: "plank" },
      ],
    },
    {
      dayIndex: 2,
      label: "Full Body B",
      exercises: [
        { slug: "reverse-lunge" },
        { slug: "db-bench-press" },
        { slug: "dumbbell-row" },
        { slug: "dumbbell-shoulder-press" },
        { slug: "glute-bridge" },
      ],
    },
    {
      dayIndex: 3,
      label: "Full Body C",
      exercises: [
        { slug: "bulgarian-split-squat" },
        { slug: "db-incline-press" },
        { slug: "chin-up" },
        { slug: "hammer-curl" },
        { slug: "side-plank" },
      ],
    },
  ],
};
