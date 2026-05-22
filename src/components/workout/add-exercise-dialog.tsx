"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GroupedExercisePicker } from "@/components/exercises/grouped-exercise-picker";
import type { Exercise } from "@/types/database";

export function AddExerciseDialog({
  catalog,
  existingIds,
  onAdd,
  disabled,
}: {
  catalog: Exercise[];
  existingIds: Set<string>;
  onAdd: (exercise: Exercise) => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAdd(exercise: Exercise) {
    startTransition(async () => {
      await onAdd(exercise);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-2" disabled={disabled || pending}>
            <Plus className="h-4 w-4" />
            Add exercise
          </Button>
        }
      />
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add exercise to workout</DialogTitle>
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
