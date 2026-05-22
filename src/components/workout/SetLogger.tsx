"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SessionSet } from "@/types/database";

interface SetLoggerProps {
  targetSets: number;
  existingSets: SessionSet[];
  onLogSet: (data: {
    weightKg: number;
    reps: number;
    rpe?: number | null;
  }) => Promise<void>;
  onDeleteSet: (setId: string) => Promise<void>;
}

export function SetLogger({
  targetSets,
  existingSets,
  onLogSet,
  onDeleteSet,
}: SetLoggerProps) {
  const [weight, setWeight] = useState("0");
  const [reps, setReps] = useState("10");
  const [rpe, setRpe] = useState("");
  const [loading, setLoading] = useState(false);

  const lastSet = existingSets[existingSets.length - 1];
  if (lastSet && weight === "0" && reps === "10") {
    // Prefill from last set on first render cycle handled via effect alternative - keep simple defaults
  }

  async function handleLog() {
    setLoading(true);
    try {
      await onLogSet({
        weightKg: parseFloat(weight) || 0,
        reps: parseInt(reps, 10) || 0,
        rpe: rpe ? parseFloat(rpe) : null,
      });
      if (lastSet) {
        setWeight(String(lastSet.weight_kg));
        setReps(String(lastSet.reps));
      }
    } finally {
      setLoading(false);
    }
  }

  function adjust(field: "weight" | "reps", delta: number) {
    if (field === "weight") {
      setWeight(String(Math.max(0, (parseFloat(weight) || 0) + delta)));
    } else {
      setReps(String(Math.max(0, (parseInt(reps, 10) || 0) + delta)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-base">Weight (kg)</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => adjust("weight", -2.5)}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <Input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-14 min-w-0 flex-1 text-center text-xl font-semibold"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => adjust("weight", 2.5)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-base">Reps</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => adjust("reps", -1)}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="h-14 min-w-0 flex-1 text-center text-xl font-semibold"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => adjust("reps", 1)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base">RPE (optional)</Label>
        <Input
          type="number"
          inputMode="decimal"
          placeholder="1-10"
          value={rpe}
          onChange={(e) => setRpe(e.target.value)}
          className="h-12"
          min={1}
          max={10}
          step={0.5}
        />
      </div>

      <Button
        className="h-14 w-full text-lg font-semibold"
        size="lg"
        onClick={handleLog}
        disabled={loading}
      >
        Log Set ({existingSets.length + 1}/{targetSets})
      </Button>

      {existingSets.length > 0 && (
        <ul className="space-y-2">
          {existingSets.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3"
            >
              <span className="min-w-0 truncate font-medium">
                Set {s.set_number}: {s.weight_kg} kg × {s.reps}
                {s.rpe != null && ` @ RPE ${s.rpe}`}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => onDeleteSet(s.id)}
                aria-label="Delete set"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
