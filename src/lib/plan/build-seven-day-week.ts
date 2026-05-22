/** Calendar weekday indices: Mon=1 … Sun=7 */
const TRAINING_SLOTS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 4, 5, 7],
  6: [1, 2, 3, 5, 6, 7],
  7: [1, 2, 3, 4, 5, 6, 7],
};

export function trainingDayIndices(daysPerWeek: number): number[] {
  const n = Math.min(7, Math.max(1, Math.round(daysPerWeek)));
  return TRAINING_SLOTS[n] ?? TRAINING_SLOTS[3];
}

export interface TrainingDayInput<T> {
  label: string;
  exercises: T[];
  /** Optional source index from template (1-based) */
  dayIndex?: number;
}

export interface SevenDaySlot<T> {
  dayIndex: number;
  label: string;
  isRestDay: boolean;
  exercises: T[];
}

/**
 * Maps N training days onto a full Mon–Sun week; gaps become rest days.
 */
export function buildSevenDayWeek<T>(
  trainingDays: TrainingDayInput<T>[],
  daysPerWeek: number
): SevenDaySlot<T>[] {
  const slots = trainingDayIndices(daysPerWeek);
  const week: SevenDaySlot<T>[] = [];

  for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
    const slotPos = slots.indexOf(dayIndex);
    const training =
      slotPos >= 0 && trainingDays[slotPos]
        ? trainingDays[slotPos]
        : trainingDays.find((d) => d.dayIndex === dayIndex);

    if (training && slotPos >= 0) {
      week.push({
        dayIndex,
        label: training.label,
        isRestDay: false,
        exercises: training.exercises,
      });
    } else {
      week.push({
        dayIndex,
        label: "Rest",
        isRestDay: true,
        exercises: [],
      });
    }
  }

  return week;
}

/** Weekday for a Date in local time: Mon=1 … Sun=7 */
export function calendarWeekdayIndex(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}
