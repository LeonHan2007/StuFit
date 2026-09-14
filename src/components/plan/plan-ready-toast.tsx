"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function PlanReadyToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("ready") === "1") {
      toast.success("Your workout plan is confirmed!");
      router.replace("/plan");
    }
    if (searchParams.get("proposal") === "1") {
      toast.message("Review your proposed plan", {
        description: "Edits save automatically. Tap Save and use this plan, or start a workout.",
      });
      router.replace("/plan");
    }
  }, [searchParams, router]);

  return null;
}
