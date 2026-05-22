"use client";

import { Progress } from "@/components/ui/progress";

export function SessionProgress({
  currentExercise,
  totalExercises,
  completedSets,
  targetSets,
}: {
  currentExercise: number;
  totalExercises: number;
  completedSets: number;
  targetSets: number;
}) {
  const exerciseProgress =
    totalExercises > 0 ? (currentExercise / totalExercises) * 100 : 0;
  const setProgress =
    targetSets > 0 ? (completedSets / targetSets) * 100 : 0;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Exercise</span>
          <span className="font-medium">
            {currentExercise} / {totalExercises}
          </span>
        </div>
        <Progress value={exerciseProgress} className="h-2" />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Sets this exercise</span>
          <span className="font-medium">
            {completedSets} / {targetSets}
          </span>
        </div>
        <Progress value={setProgress} className="h-2" />
      </div>
    </div>
  );
}
