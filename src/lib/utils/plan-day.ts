export function getPlanDayLabel(planDays: unknown): string {
  if (!planDays) return "Workout";
  if (Array.isArray(planDays)) {
    const first = planDays[0] as { label?: string } | undefined;
    return first?.label ?? "Workout";
  }
  return (planDays as { label?: string }).label ?? "Workout";
}
