import { weekdayName } from "@/lib/plan/build-seven-day-week";

export { weekdayName };

type PlanDayRef = { label?: string; day_index?: number };

function asPlanDay(planDays: unknown): PlanDayRef | null {
  if (!planDays) return null;
  if (Array.isArray(planDays)) {
    return (planDays[0] as PlanDayRef | undefined) ?? null;
  }
  return planDays as PlanDayRef;
}

export function getPlanDayLabel(planDays: unknown): string {
  const day = asPlanDay(planDays);
  if (!day) return "Workout";

  const weekday =
    typeof day.day_index === "number" ? weekdayName(day.day_index) : undefined;
  const label = day.label?.trim();

  if (weekday && label && label !== weekday) return `${weekday} · ${label}`;
  return weekday ?? label ?? "Workout";
}
