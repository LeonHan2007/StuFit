"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { SetLogger } from "@/components/workout/SetLogger";
import { RestTimer } from "@/components/workout/RestTimer";
import { SessionProgress } from "@/components/workout/SessionProgress";
import { AddExerciseDialog } from "@/components/workout/add-exercise-dialog";
import { LocationStatus } from "@/components/workout/location-status";
import { Button } from "@/components/ui/button";
import { EndWorkoutDialog } from "@/components/workout/end-workout-dialog";
import { completeWorkout, discardWorkout } from "@/app/actions/workout";
import { useSessionLocationTracking } from "@/hooks/use-session-location-tracking";
import type { Exercise, SessionSet } from "@/types/database";

export interface SessionExerciseRow {
  id: string;
  exercise_id: string;
  order_index: number;
  exercises: Exercise;
  target_sets: number;
  rest_seconds: number;
}

export function LiveWorkoutClient({
  sessionId,
  exercises: initialExercises,
  exerciseCatalog,
  hasWorkoutLocations,
  isPlannedWorkout,
}: {
  sessionId: string;
  exercises: SessionExerciseRow[];
  exerciseCatalog: Exercise[];
  hasWorkoutLocations: boolean;
  isPlannedWorkout: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [exercises, setExercises] = useState(initialExercises);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, SessionSet[]>>(
    {}
  );
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [adding, setAdding] = useState(false);

  const trackLocation = hasWorkoutLocations && isPlannedWorkout;
  const { status: locationStatus, checkLocation } = useSessionLocationTracking(
    sessionId,
    trackLocation
  );

  const current = exercises[exerciseIndex];
  const currentSets = setsByExercise[current?.id] ?? [];
  const existingIds = new Set(exercises.map((e) => e.exercise_id));

  const loadSets = useCallback(
    async (sessionExerciseId: string) => {
      const { data } = await supabase
        .from("session_sets")
        .select("*")
        .eq("session_exercise_id", sessionExerciseId)
        .order("set_number");
      if (data) {
        setSetsByExercise((prev) => ({
          ...prev,
          [sessionExerciseId]: data as SessionSet[],
        }));
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (current) loadSets(current.id);
  }, [current?.id, loadSets]);

  async function addExerciseToSession(exercise: Exercise) {
    setAdding(true);
    const orderIndex = exercises.length;

    const { data: inserted, error } = await supabase
      .from("session_exercises")
      .insert({
        session_id: sessionId,
        exercise_id: exercise.id,
        order_index: orderIndex,
      })
      .select("id, exercise_id, order_index")
      .single();

    if (error || !inserted) {
      toast.error(error?.message ?? "Failed to add exercise");
      setAdding(false);
      return;
    }

    const row: SessionExerciseRow = {
      id: inserted.id,
      exercise_id: inserted.exercise_id,
      order_index: inserted.order_index,
      exercises: exercise,
      target_sets: 3,
      rest_seconds: 90,
    };

    setExercises((prev) => {
      const next = [...prev, row];
      if (prev.length === 0) setExerciseIndex(0);
      return next;
    });
    toast.success(`${exercise.name} added`);
    setAdding(false);
  }

  async function onLogSet(data: {
    weightKg: number;
    reps: number;
    rpe?: number | null;
  }) {
    if (!current) return;
    const setNumber = currentSets.length + 1;

    const { data: inserted, error } = await supabase
      .from("session_sets")
      .insert({
        session_exercise_id: current.id,
        set_number: setNumber,
        weight_kg: data.weightKg,
        reps: data.reps,
        rpe: data.rpe ?? null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to log set", {
        description: error.message,
        action: {
          label: "Retry",
          onClick: () => onLogSet(data),
        },
      });
      return;
    }

    if (inserted) {
      setSetsByExercise((prev) => ({
        ...prev,
        [current.id]: [...(prev[current.id] ?? []), inserted as SessionSet],
      }));
      toast.success(`Set ${setNumber} logged`);
    }
  }

  async function onDeleteSet(setId: string) {
    if (!current) return;
    const { error } = await supabase.from("session_sets").delete().eq("id", setId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadSets(current.id);
  }

  async function saveWorkout() {
    setEnding(true);
    try {
      if (trackLocation) {
        await checkLocation();
      }
      const result = await completeWorkout(sessionId);
      if (result.qualifiesForStreak) {
        toast.success("Workout complete — streak day earned!");
      } else if (result.reasons.length > 0) {
        toast.success("Workout saved", {
          description: result.reasons.join(" · "),
        });
      } else {
        toast.success("Workout complete!");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save workout");
      setEnding(false);
    }
  }

  async function discardWorkoutSession() {
    setEnding(true);
    try {
      await discardWorkout(sessionId);
      toast.success("Workout discarded");
      router.push("/workout");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to discard workout");
      setEnding(false);
    }
  }

  const endWorkoutDialog = (
    <EndWorkoutDialog
      open={endDialogOpen}
      onOpenChange={(open) => {
        if (!ending) setEndDialogOpen(open);
      }}
      onSave={saveWorkout}
      onDiscard={discardWorkoutSession}
      busy={ending}
    />
  );

  const exitButton = (
    <Button
      variant="ghost"
      className="w-full text-muted-foreground"
      onClick={() => setEndDialogOpen(true)}
      disabled={ending}
    >
      Exit workout
    </Button>
  );

  function nextExercise() {
    if (exerciseIndex < exercises.length - 1) {
      setExerciseIndex((i) => i + 1);
    }
  }

  if (!current) {
    return (
      <div className="min-w-0 space-y-6 overflow-x-hidden text-center">
        {endWorkoutDialog}
        {isPlannedWorkout && (
          <LocationStatus status={locationStatus} hasLocations={hasWorkoutLocations} />
        )}
        <p className="text-muted-foreground">
          Start by adding exercises to this workout.
        </p>
        <AddExerciseDialog
          catalog={exerciseCatalog}
          existingIds={existingIds}
          onAdd={addExerciseToSession}
          disabled={adding}
        />
        <Button
          variant="secondary"
          className="mt-2 h-12 w-full"
          onClick={() => setEndDialogOpen(true)}
          disabled={ending}
        >
          Finish workout
        </Button>
        {exitButton}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {endWorkoutDialog}
      {isPlannedWorkout && (
        <LocationStatus status={locationStatus} hasLocations={hasWorkoutLocations} />
      )}
      <SessionProgress
        currentExercise={exerciseIndex + 1}
        totalExercises={exercises.length}
        completedSets={currentSets.length}
        targetSets={current.target_sets}
      />

      <ExerciseCard exercise={current.exercises} />

      <SetLogger
        targetSets={current.target_sets}
        existingSets={currentSets}
        onLogSet={onLogSet}
        onDeleteSet={onDeleteSet}
      />

      <RestTimer seconds={current.rest_seconds} autoStart={currentSets.length > 0} />

      <div className="flex flex-wrap gap-2">
        <AddExerciseDialog
          catalog={exerciseCatalog}
          existingIds={existingIds}
          onAdd={addExerciseToSession}
          disabled={adding}
        />
      </div>

      <div className="flex gap-3 pt-2">
        {exerciseIndex < exercises.length - 1 ? (
          <Button
            className="h-14 flex-1 text-lg"
            variant="secondary"
            onClick={nextExercise}
          >
            Next exercise
          </Button>
        ) : (
          <Button
            className="h-14 flex-1 text-lg"
            onClick={() => setEndDialogOpen(true)}
            disabled={ending}
          >
            Finish workout
          </Button>
        )}
      </div>
      {exitButton}
    </div>
  );
}
