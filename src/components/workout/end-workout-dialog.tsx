"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EndWorkoutDialog({
  open,
  onOpenChange,
  onSave,
  onDiscard,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDiscard: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Save this workout?</DialogTitle>
          <DialogDescription>
            Saved workouts appear in your history and count toward your stats.
            Discarding removes this session permanently.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-0 bg-transparent p-0 sm:flex-col">
          <Button className="h-11 w-full" onClick={onSave} disabled={busy}>
            Save workout
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={onDiscard}
            disabled={busy}
          >
            Don&apos;t save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
