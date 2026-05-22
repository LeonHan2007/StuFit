import type { PlanTemplate } from "./types";

export const upperLowerTemplate: PlanTemplate = {
  name: "Upper / Lower",
  days: [
    {
      dayIndex: 1,
      label: "Upper A",
      exercises: [
        { slug: "barbell-bench-press" },
        { slug: "barbell-row" },
        { slug: "overhead-press" },
        { slug: "lat-pulldown" },
        { slug: "tricep-pushdown" },
      ],
    },
    {
      dayIndex: 2,
      label: "Lower A",
      exercises: [
        { slug: "barbell-squat" },
        { slug: "romanian-deadlift" },
        { slug: "leg-press" },
        { slug: "leg-curl" },
        { slug: "calf-raise" },
      ],
    },
    {
      dayIndex: 3,
      label: "Upper B",
      exercises: [
        { slug: "incline-dumbbell-press" },
        { slug: "dumbbell-row" },
        { slug: "lateral-raise" },
        { slug: "face-pull" },
        { slug: "barbell-curl" },
      ],
    },
    {
      dayIndex: 4,
      label: "Lower B",
      exercises: [
        { slug: "front-squat" },
        { slug: "hip-thrust" },
        { slug: "walking-lunge" },
        { slug: "leg-extension" },
        { slug: "plank" },
      ],
    },
  ],
};

export const upperLowerHomeTemplate: PlanTemplate = {
  name: "Upper / Lower (Home)",
  days: [
    {
      dayIndex: 1,
      label: "Upper A",
      exercises: [
        { slug: "db-bench-press" },
        { slug: "dumbbell-row" },
        { slug: "dumbbell-shoulder-press" },
        { slug: "push-up" },
        { slug: "hammer-curl" },
      ],
    },
    {
      dayIndex: 2,
      label: "Lower A",
      exercises: [
        { slug: "goblet-squat" },
        { slug: "reverse-lunge" },
        { slug: "glute-bridge" },
        { slug: "step-up" },
        { slug: "calf-raise" },
      ],
    },
    {
      dayIndex: 3,
      label: "Upper B",
      exercises: [
        { slug: "db-incline-press" },
        { slug: "inverted-row" },
        { slug: "lateral-raise" },
        { slug: "band-pull-apart" },
        { slug: "tricep-pushdown" },
      ],
    },
    {
      dayIndex: 4,
      label: "Lower B",
      exercises: [
        { slug: "bulgarian-split-squat" },
        { slug: "romanian-deadlift" },
        { slug: "wall-sit" },
        { slug: "mountain-climber" },
        { slug: "side-plank" },
      ],
    },
  ],
};
