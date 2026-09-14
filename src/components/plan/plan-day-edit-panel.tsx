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
} from "lucide-react";
import {
  updatePlanDayLabel,
  addPlanExercise,
  removePlanExercise,
  updatePlanExercise,
  setPlanDayRest,
  reorderPlanExercises,
} from "@/app/actions/plan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GroupedExercisePicker } from "@/components/exercises/grouped-exercise-picker";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types/database";
import type { PlanDayWithExercises } from "@/components/plan/plan-types";

type PlanExercise = PlanDayWithExercises["plan_day_exercises"][number];

function resolveExercise(
  exercises: Exercise | Exercise[] | null | undefined
): Exercise | null {
  if (!exercises) return null;
  return Array.isArray(exercises) ? exercises[0] ?? null : exercises;
}

function sortExercises(exercises: PlanExercise[]) {
  return [...exercises].sort((a, b) => a.order_index - b.order_index);
}

function PlanAddExerciseDialog({
  planDayId,
  catalog,
  existingIds,
  onAdded,
}: {
  planDayId: string;
  catalog: Exercise[];
  existingIds: Set<string>;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAdd(exercise: Exercise) {
    startTransition(async () => {
      try {
        await addPlanExercise(planDayId, exercise.id);
        toast.success("Exercise added");
        setOpen(false);
        onAdded();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-11 gap-1">
            <Plus className="h-4 w-4" />
            Add exercise
          </Button>
        }
      />
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
        </DialogHeader>
        <GroupedExercisePicker
          catalog={catalog}
          existingIds={existingIds}
          onSelect={handleAdd}
          disabled={pending}
        />
      </DialogContent>
    </Dialog>
  );
}

function ExerciseRow({
  planExerciseId,
  name,
  muscleGroup,
  sets,
  repsMin,
  repsMax,
  restSeconds,
  index,
  total,
  isDragging,
  pending,
  onUpdated,
  onRemove,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  planExerciseId: string;
  name: string;
  muscleGroup: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  index: number;
  total: number;
  isDragging: boolean;
  pending: boolean;
  onUpdated: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [savePending, startTransition] = useTransition();
  const [values, setValues] = useState({
    sets: String(sets),
    repsMin: String(repsMin),
    repsMax: String(repsMax),
    restSeconds: String(restSeconds),
  });

  useEffect(() => {
    setValues({
      sets: String(sets),
      repsMin: String(repsMin),
      repsMax: String(repsMax),
      restSeconds: String(restSeconds),
    });
  }, [sets, repsMin, repsMax, restSeconds]);

  function save() {
    startTransition(async () => {
      try {
        await updatePlanExercise(planExerciseId, {
          sets: parseInt(values.sets, 10),
          repsMin: parseInt(values.repsMin, 10),
          repsMax: parseInt(values.repsMax, 10),
          restSeconds: parseInt(values.restSeconds, 10),
        });
        onUpdated();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  return (
    <li
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "space-y-2 rounded-lg border border-border/50 bg-background/50 p-3",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="hidden cursor-grab touch-none text-muted-foreground active:cursor-grabbing sm:block"
            aria-label={`Reorder ${name}`}
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
              className="h-8 w-8"
              aria-label={`Move ${name} up`}
              disabled={pending || index === 0}
              onClick={() => onMove(-1)}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label={`Move ${name} down`}
              disabled={pending || index === total - 1}
              onClick={() => onMove(1)}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <Badge variant="outline" className="mt-0.5 text-xs">
              {muscleGroup}
            </Badge>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={pending || savePending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Sets</Label>
          <Input
            type="number"
            min={1}
            max={20}
            className="h-10"
            value={values.sets}
            onChange={(e) => setValues((v) => ({ ...v, sets: e.target.value }))}
            onBlur={save}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            min={1}
            max={100}
            className="h-10"
            value={values.repsMin}
            onChange={(e) =>
              setValues((v) => ({ ...v, repsMin: e.target.value }))
            }
            onBlur={save}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max</Label>
          <Input
            type="number"
            min={1}
            max={100}
            className="h-10"
            value={values.repsMax}
            onChange={(e) =>
              setValues((v) => ({ ...v, repsMax: e.target.value }))
            }
            onBlur={save}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Rest</Label>
          <Input
            type="number"
            min={0}
            max={600}
            className="h-10"
            value={values.restSeconds}
            onChange={(e) =>
              setValues((v) => ({ ...v, restSeconds: e.target.value }))
            }
            onBlur={save}
          />
        </div>
      </div>
    </li>
  );
}

export function PlanDayEditPanel({
  day,
  exerciseCatalog,
}: {
  day: PlanDayWithExercises;
  exerciseCatalog: Exercise[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(day.label);
  const [isRestDay, setIsRestDay] = useState(day.is_rest_day ?? false);
  const [orderedExercises, setOrderedExercises] = useState(() =>
    sortExercises(day.plan_day_exercises ?? [])
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setLabel(day.label);
  }, [day.label]);

  useEffect(() => {
    setIsRestDay(day.is_rest_day ?? false);
  }, [day.is_rest_day]);

  useEffect(() => {
    setOrderedExercises(sortExercises(day.plan_day_exercises ?? []));
  }, [day.plan_day_exercises]);

  const existingIds = new Set(orderedExercises.map((e) => e.exercise_id));

  function refresh() {
    router.refresh();
  }

  function saveLabel() {
    if (label.trim() === day.label) return;
    startTransition(async () => {
      try {
        await updatePlanDayLabel(day.id, label);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  function handleRestChange(nextIsRestDay: boolean) {
    setIsRestDay(nextIsRestDay);
    startTransition(async () => {
      try {
        await setPlanDayRest(day.id, nextIsRestDay);
        refresh();
      } catch (e) {
        setIsRestDay(day.is_rest_day ?? false);
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  function handleRemoveExercise(planExerciseId: string) {
    startTransition(async () => {
      try {
        await removePlanExercise(planExerciseId);
        toast.success("Exercise removed");
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove");
      }
    });
  }

  function commitReorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    const next = [...orderedExercises];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const withIndex = next.map((ex, i) => ({ ...ex, order_index: i }));
    setOrderedExercises(withIndex);

    startTransition(async () => {
      try {
        await reorderPlanExercises(
          day.id,
          withIndex.map((ex) => ex.id)
        );
        refresh();
      } catch (e) {
        setOrderedExercises(sortExercises(day.plan_day_exercises ?? []));
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

  return (
    <div className="border-t border-border/60 bg-muted/20 px-3 py-4">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`day-label-${day.id}`} className="text-xs">
            Workout name
          </Label>
          <Input
            id={`day-label-${day.id}`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={saveLabel}
            disabled={pending}
            className="h-9"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={isRestDay}
            onCheckedChange={(v) => handleRestChange(v === true)}
            disabled={pending}
          />
          Rest day
        </label>

        {isRestDay ? (
          <p className="text-sm text-muted-foreground">
            Rest day — no exercises.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Exercises</p>
            {orderedExercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exercises yet.</p>
            ) : (
              <ul className="space-y-2">
                {orderedExercises.map((pe, index) => {
                  const ex = resolveExercise(pe.exercises);
                  return (
                    <ExerciseRow
                      key={pe.id}
                      planExerciseId={pe.id}
                      name={ex?.name ?? "Unknown"}
                      muscleGroup={ex?.muscle_group ?? ""}
                      sets={pe.sets}
                      repsMin={pe.reps_min}
                      repsMax={pe.reps_max}
                      restSeconds={pe.rest_seconds}
                      index={index}
                      total={orderedExercises.length}
                      isDragging={dragIndex === index}
                      pending={pending}
                      onUpdated={refresh}
                      onRemove={() => handleRemoveExercise(pe.id)}
                      onMove={(direction) =>
                        commitReorder(index, index + direction)
                      }
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setDragIndex(index);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={() => setDragIndex(null)}
                    />
                  );
                })}
              </ul>
            )}
            <PlanAddExerciseDialog
              planDayId={day.id}
              catalog={exerciseCatalog}
              existingIds={existingIds}
              onAdded={refresh}
            />
          </div>
        )}
      </div>
    </div>
  );
}
