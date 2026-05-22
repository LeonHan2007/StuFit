"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { toast } from "sonner";
import {
  confirmPlan,
  discardDraftPlan,
  regenerateDraftPlan,
} from "@/app/actions/plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PlanProposalBanner({ planId }: { planId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revisionNotes, setRevisionNotes] = useState("");

  function handleConfirm() {
    startTransition(async () => {
      try {
        await confirmPlan(planId);
      } catch (e) {
        if (isRedirectError(e)) return;
        toast.error(e instanceof Error ? e.message : "Failed to confirm plan");
      }
    });
  }

  function handleDiscard() {
    if (!confirm("Discard this proposed plan and keep your current one?")) return;
    startTransition(async () => {
      try {
        await discardDraftPlan(planId);
        toast.success("Proposal discarded");
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) return;
        toast.error(e instanceof Error ? e.message : "Failed to discard");
      }
    });
  }

  function handleRegenerate() {
    const trimmed = revisionNotes.trim();
    if (!trimmed) {
      toast.error("Describe the changes you want first");
      return;
    }

    startTransition(async () => {
      try {
        const result = await regenerateDraftPlan(planId, trimmed);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        setRevisionNotes("");
        toast.success(result.message ?? "Plan updated", { duration: 5000 });
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) return;
        toast.error(
          e instanceof Error ? e.message : "Failed to regenerate plan"
        );
      }
    });
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 py-5">
        <div>
          <p className="font-semibold">Review your proposed plan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit days and exercises below, or describe changes and regenerate.
            Your current plan stays active until you confirm.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan-revision-notes" className="text-sm">
            Request changes (optional)
          </Label>
          <Textarea
            id="plan-revision-notes"
            placeholder='e.g. "Remove all dumbbell exercises" or "Incorporate more cardio"'
            className="min-h-[100px] resize-y bg-background"
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            maxLength={500}
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            {revisionNotes.trim().length}/500 — used when you regenerate the plan
          </p>
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full sm:w-auto"
            onClick={handleRegenerate}
            disabled={pending || revisionNotes.trim().length === 0}
          >
            {pending ? "Regenerating..." : "Regenerate plan with changes"}
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-12 flex-1 text-base"
            onClick={handleConfirm}
            disabled={pending}
          >
            Confirm plan
          </Button>
          <Button
            variant="outline"
            className="h-12 flex-1"
            onClick={handleDiscard}
            disabled={pending}
          >
            Keep current plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
