"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { addPlanDay } from "@/app/actions/plan";
import { startWorkout } from "@/app/actions/workout";
import { PlanDayEditPanel } from "@/components/plan/plan-day-edit-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WEEKDAY_NAMES,
  weekdayName,
} from "@/lib/plan/build-seven-day-week";
import type { Exercise } from "@/types/database";
import type { PlanDayWithExercises } from "@/components/plan/plan-types";

export type { PlanDayWithExercises };

function resolveExercise(
  exercises: Exercise | Exercise[] | null | undefined
): Exercise | null {
  if (!exercises) return null;
  return Array.isArray(exercises) ? exercises[0] ?? null : exercises;
}

function daySummary(day: PlanDayWithExercises) {
  if (day.is_rest_day ?? false) return "Rest day — counts toward streak";
  const exercises = [...(day.plan_day_exercises ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );
  if (exercises.length === 0) return "No exercises";
  const names = exercises
    .map((pe) => resolveExercise(pe.exercises)?.name)
    .filter(Boolean) as string[];
  if (names.length <= 2) return names.join(" · ");
  return `${names.slice(0, 2).join(" · ")} +${names.length - 2} more`;
}

export function PlanEditor({
  planDays,
  todayDayId,
  exerciseCatalog,
  isProposal = false,
}: {
  planDays: PlanDayWithExercises[];
  todayDayId?: string;
  exerciseCatalog: Exercise[];
  isProposal?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(planDays);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);

  useEffect(() => {
    setDays(planDays);
  }, [planDays]);

  function handleAddDay(dayIndex: number, isRestDay: boolean) {
    startTransition(async () => {
      try {
        await addPlanDay(isRestDay ? "Rest" : "Workout", dayIndex, isRestDay);
        toast.success(isRestDay ? "Rest day added" : "Workout added");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add");
      }
    });
  }

  function toggleEdit(dayId: string) {
    setEditingDayId((current) => (current === dayId ? null : dayId));
  }

  const todayDay =
    !isProposal && todayDayId
      ? days.find((d) => d.id === todayDayId) ?? days[0]
      : null;

  const week = WEEKDAY_NAMES.map((name, i) => {
    const dayIndex = i + 1;
    return {
      name,
      dayIndex,
      day: days.find((d) => d.day_index === dayIndex) ?? null,
    };
  });

  return (
    <div className="space-y-6">
      {todayDay && !(todayDay.is_rest_day ?? false) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>
              Today · {weekdayName(todayDay.day_index)}: {todayDay.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={startWorkout.bind(null, todayDay.id)}>
              <Button type="submit" size="lg" className="h-14 w-full text-lg">
                Start Today&apos;s Workout
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      {todayDay && (todayDay.is_rest_day ?? false) && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle>
              Today · {weekdayName(todayDay.day_index)}: Rest day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Rest day — counts toward your streak.
            </p>
          </CardContent>
        </Card>
      )}

      <h2 className="text-lg font-semibold">
        {isProposal ? "Edit proposal" : "Your plan"}
      </h2>

      <ul className="space-y-2">
        {week.map(({ name, dayIndex, day }) => {
          const isEditing = day != null && editingDayId === day.id;
          const isToday = day != null && day.id === todayDayId;
          const isRest = day?.is_rest_day ?? false;

          return (
            <li key={dayIndex} className="flex items-stretch gap-2 sm:gap-3">
              <div
                className={cn(
                  "flex w-16 shrink-0 flex-col justify-center border-r border-border/70 pr-2 sm:w-28 sm:pr-3",
                  isToday && "text-primary"
                )}
              >
                <p className="text-sm font-semibold leading-tight sm:text-base">
                  {name}
                </p>
                {isToday && (
                  <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
                    Today
                  </Badge>
                )}
              </div>

              <div
                className={cn(
                  "min-w-0 flex-1 overflow-hidden rounded-xl border bg-card",
                  isRest && "border-dashed bg-muted/30",
                  isEditing && "ring-1 ring-primary/30",
                  isToday && !isRest && "border-primary/20 bg-primary/5"
                )}
              >
                {day ? (
                  <>
                    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-tight">{day.label}</p>
                        {!isEditing && (
                          <p className="truncate text-sm text-muted-foreground">
                            {daySummary(day)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!isProposal && !isRest && (
                          <form
                            action={startWorkout.bind(null, day.id)}
                            className="min-w-0 flex-1 sm:flex-initial"
                          >
                            <Button
                              type="submit"
                              variant="outline"
                              className="h-11 w-full sm:w-auto"
                            >
                              Start
                            </Button>
                          </form>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-10 w-10 shrink-0",
                            isEditing
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                          aria-label={
                            isEditing ? "Close edit" : `Edit ${name} workout`
                          }
                          aria-expanded={isEditing}
                          onClick={() => toggleEdit(day.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <PlanDayEditPanel
                        day={day}
                        exerciseCatalog={exerciseCatalog}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      No workout on this day
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 gap-1"
                        disabled={pending}
                        onClick={() => handleAddDay(dayIndex, false)}
                      >
                        <Plus className="h-4 w-4" />
                        Workout
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11"
                        disabled={pending}
                        onClick={() => handleAddDay(dayIndex, true)}
                      >
                        Rest
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
