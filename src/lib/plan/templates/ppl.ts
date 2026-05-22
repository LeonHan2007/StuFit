import type { PlanTemplate } from "./types";

export const pplTemplate: PlanTemplate = {
  name: "Push Pull Legs",
  days: [
    {
      dayIndex: 1,
      label: "Push",
      exercises: [
        { slug: "barbell-bench-press" },
        { slug: "overhead-press" },
        { slug: "incline-dumbbell-press" },
        { slug: "lateral-raise" },
        { slug: "tricep-pushdown" },
        { slug: "skull-crusher" },
      ],
    },
    {
      dayIndex: 2,
      label: "Pull",
      exercises: [
        { slug: "deadlift" },
        { slug: "pull-up" },
        { slug: "barbell-row" },
        { slug: "face-pull" },
        { slug: "barbell-curl" },
        { slug: "hammer-curl" },
      ],
    },
    {
      dayIndex: 3,
      label: "Legs",
      exercises: [
        { slug: "barbell-squat" },
        { slug: "romanian-deadlift" },
        { slug: "leg-press" },
        { slug: "leg-curl" },
        { slug: "calf-raise" },
        { slug: "cable-crunch" },
      ],
    },
    {
      dayIndex: 4,
      label: "Push B",
      exercises: [
        { slug: "db-bench-press" },
        { slug: "arnold-press" },
        { slug: "dumbbell-fly" },
        { slug: "dips" },
        { slug: "lateral-raise" },
      ],
    },
    {
      dayIndex: 5,
      label: "Pull B",
      exercises: [
        { slug: "lat-pulldown" },
        { slug: "seated-cable-row" },
        { slug: "dumbbell-row" },
        { slug: "chin-up" },
        { slug: "face-pull" },
      ],
    },
    {
      dayIndex: 6,
      label: "Legs B",
      exercises: [
        { slug: "front-squat" },
        { slug: "hip-thrust" },
        { slug: "bulgarian-split-squat" },
        { slug: "leg-extension" },
        { slug: "walking-lunge" },
      ],
    },
  ],
};

export const pplHomeTemplate: PlanTemplate = {
  name: "Push Pull Legs (Home)",
  days: [
    {
      dayIndex: 1,
      label: "Push",
      exercises: [
        { slug: "push-up" },
        { slug: "pike-push-up" },
        { slug: "db-incline-press" },
        { slug: "dumbbell-shoulder-press" },
        { slug: "dips" },
      ],
    },
    {
      dayIndex: 2,
      label: "Pull",
      exercises: [
        { slug: "chin-up" },
        { slug: "inverted-row" },
        { slug: "dumbbell-row" },
        { slug: "band-pull-apart" },
        { slug: "hammer-curl" },
      ],
    },
    {
      dayIndex: 3,
      label: "Legs",
      exercises: [
        { slug: "goblet-squat" },
        { slug: "reverse-lunge" },
        { slug: "glute-bridge" },
        { slug: "step-up" },
        { slug: "plank" },
      ],
    },
    {
      dayIndex: 4,
      label: "Push B",
      exercises: [
        { slug: "db-bench-press" },
        { slug: "push-up" },
        { slug: "lateral-raise" },
        { slug: "pike-push-up" },
      ],
    },
    {
      dayIndex: 5,
      label: "Pull B",
      exercises: [
        { slug: "pull-up" },
        { slug: "inverted-row" },
        { slug: "dumbbell-row" },
        { slug: "db-shrug" },
      ],
    },
    {
      dayIndex: 6,
      label: "Legs B",
      exercises: [
        { slug: "bulgarian-split-squat" },
        { slug: "wall-sit" },
        { slug: "mountain-climber" },
        { slug: "side-plank" },
      ],
    },
  ],
};
