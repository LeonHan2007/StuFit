"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setStreakAccountability } from "@/app/actions/accountability";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function StreakAccountabilityToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    const previous = on;
    setOn(checked);
    startTransition(async () => {
      const result = await setStreakAccountability(checked);
      if (!result.ok) {
        setOn(previous);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor="streak-accountability" className="cursor-pointer">
          Accountability for streaks
        </Label>
        <p className="text-sm text-muted-foreground">
          When this is on, a workout counts toward your streak only if you stay
          inside an approved location the whole time. Turn it off to skip the
          location check.
        </p>
      </div>
      <Switch
        id="streak-accountability"
        checked={on}
        onCheckedChange={handleChange}
        disabled={pending}
        aria-label="Accountability for streaks"
      />
    </div>
  );
}
