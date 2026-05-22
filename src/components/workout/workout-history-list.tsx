"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteWorkout } from "@/app/actions/workout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type HistorySet = {
  setNumber: number;
  weightKg: number;
  reps: number;
};

export type HistoryExercise = {
  id: string;
  name: string;
  sets: HistorySet[];
};

export type HistorySession = {
  id: string;
  title: string;
  dateLabel: string;
  durationMinutes: number | null;
  exercises: HistoryExercise[];
};

export function WorkoutHistoryList({ sessions }: { sessions: HistorySession[] }) {
  const router = useRouter();
  const [items, setItems] = useState(sessions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteWorkout(deleteId);
      setItems((prev) => prev.filter((s) => s.id !== deleteId));
      if (expandedId === deleteId) setExpandedId(null);
      setDeleteId(null);
      toast.success("Workout deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete workout");
    } finally {
      setDeleting(false);
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No completed workouts yet.
      </p>
    );
  }

  return (
    <>
      <Dialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!deleting && !open) setDeleteId(null);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto" showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Delete workout?</DialogTitle>
            <DialogDescription>
              This removes the workout from your history and updates your stats.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent p-0 sm:flex-col">
            <Button
              variant="destructive"
              className="w-full"
              onClick={confirmDelete}
              disabled={deleting}
            >
              Delete workout
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setDeleteId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ul className="space-y-2">
      {items.map((session) => {
        const open = expandedId === session.id;
        return (
          <li key={session.id}>
            <Card className={cn(open && "ring-1 ring-primary/30")}>
              <div className="flex items-center gap-1 pr-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4 text-left"
                aria-expanded={open}
                onClick={() =>
                  setExpandedId((id) => (id === session.id ? null : session.id))
                }
              >
                <div className="min-w-0">
                  <p className="font-medium">{session.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.dateLabel}
                    {session.durationMinutes != null &&
                      ` · ${session.durationMinutes} min`}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-180"
                  )}
                />
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Delete workout"
                onClick={() => setDeleteId(session.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              </div>

              {open && (
                <CardContent className="border-t pt-0 pb-4">
                  <p className="mb-4 text-sm font-medium text-muted-foreground">
                    Time spent:{" "}
                    {session.durationMinutes != null
                      ? `${session.durationMinutes} minutes`
                      : "—"}
                  </p>
                  {session.exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No exercises logged.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {session.exercises.map((ex) => (
                        <li key={ex.id}>
                          <p className="truncate font-medium">{ex.name}</p>
                          {ex.sets.length === 0 ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              No sets logged
                            </p>
                          ) : (
                            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                              {ex.sets.map((set) => (
                                <li key={set.setNumber}>
                                  Set {set.setNumber}: {set.weightKg} kg ×{" "}
                                  {set.reps} reps
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
    </>
  );
}
