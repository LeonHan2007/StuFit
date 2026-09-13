"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  addPlanDay,
  removePlanDay,
  reorderPlanDays,
} from "@/app/actions/plan";
import { startWorkout } from "@/app/actions/workout";
import { PlanDayEditPanel } from "@/components/plan/plan-day-edit-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { weekdayName } from "@/lib/plan/build-seven-day-week";
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
  const [orderedDays, setOrderedDays] = useState(planDays);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [newDayLabel, setNewDayLabel] = useState("");

  useEffect(() => {
    setOrderedDays(planDays);
  }, [planDays]);

  function handleAddDay() {
    startTransition(async () => {
      try {
        await addPlanDay(newDayLabel);
        setNewDayLabel("");
        toast.success("Day added");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add day");
      }
    });
  }

  function handleRemoveDay(planDayId: string) {
    if (!confirm("Remove this day and all its exercises?")) return;
    startTransition(async () => {
      try {
        await removePlanDay(planDayId);
        if (editingDayId === planDayId) setEditingDayId(null);
        toast.success("Day removed");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove day");
      }
    });
  }

  function toggleEdit(dayId: string) {
    setEditingDayId((current) => (current === dayId ? null : dayId));
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.effectAllowed = "move";
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function commitReorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    const next = [...orderedDays];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderedDays(next.map((d, i) => ({ ...d, day_index: i + 1 })));

    startTransition(async () => {
      try {
        await reorderPlanDays(next.map((d) => d.id));
        router.refresh();
      } catch (e) {
        setOrderedDays(planDays);
        toast.error(e instanceof Error ? e.message : "Failed to reorder");
      }
    });
  }

  function handleDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    commitReorder(dragIndex, dropIndex);
    setDragIndex(null);
  }

  function moveDay(index: number, direction: -1 | 1) {
    const toIndex = index + direction;
    if (toIndex < 0 || toIndex >= orderedDays.length) return;
    commitReorder(index, toIndex);
  }

  const todayDay =
    !isProposal && todayDayId
      ? orderedDays.find((d) => d.id === todayDayId) ?? orderedDays[0]
      : null;

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">
          {isProposal ? "Edit proposal" : "Your plan"}
        </h2>
        <div className="flex min-w-0 gap-2">
          <Input
            placeholder="Workout name"
            value={newDayLabel}
            onChange={(e) => setNewDayLabel(e.target.value)}
            className="h-10 min-w-0 flex-1"
          />
          <Button
            variant="outline"
            onClick={handleAddDay}
            disabled={pending || orderedDays.length >= 7}
            className="h-11 shrink-0 gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {orderedDays.map((day, index) => {
          const isEditing = editingDayId === day.id;

          return (
            <li
              key={day.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              className={cn(
                "overflow-hidden rounded-xl border bg-card transition-opacity",
                (day.is_rest_day ?? false) && "border-dashed bg-muted/30",
                dragIndex === index && "opacity-50",
                isEditing && "ring-1 ring-primary/30"
              )}
            >
              <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={() => setDragIndex(null)}
                    className="hidden cursor-grab touch-none text-muted-foreground active:cursor-grabbing sm:block"
                    aria-label={`Move ${weekdayName(day.day_index)} workout`}
                    role="button"
                    tabIndex={0}
                  >
                    <GripVertical className="h-5 w-5" />
                  </div>

                  <div className="flex shrink-0 flex-col gap-0.5 sm:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      aria-label={`Move ${weekdayName(day.day_index)} up`}
                      disabled={pending || index === 0}
                      onClick={() => moveDay(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      aria-label={`Move ${weekdayName(day.day_index)} down`}
                      disabled={pending || index === orderedDays.length - 1}
                      onClick={() => moveDay(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">
                      {weekdayName(day.day_index)}: {day.label}
                    </p>
                    {!isEditing && (
                      <p className="truncate text-sm text-muted-foreground">
                        {daySummary(day)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isProposal && !(day.is_rest_day ?? false) && (
                    <form action={startWorkout.bind(null, day.id)} className="min-w-0 flex-1 sm:flex-initial">
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
                      isEditing ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-label={isEditing ? "Close edit" : `Edit ${day.label}`}
                    aria-expanded={isEditing}
                    onClick={() => toggleEdit(day.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                    aria-label={`Delete ${day.label}`}
                    onClick={() => handleRemoveDay(day.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isEditing && (
                <PlanDayEditPanel day={day} exerciseCatalog={exerciseCatalog} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
