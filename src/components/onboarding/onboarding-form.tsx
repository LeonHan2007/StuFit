"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { submitOnboarding } from "@/app/actions/onboarding";
import {
  onboardingSchema,
  type OnboardingFormValues,
} from "@/lib/validations/onboarding";
import { EXERCISE_MODALITIES } from "@/lib/exercises/constants";
import type { ExerciseModality } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GOALS = [
  { id: "strength", label: "Strength" },
  { id: "hypertrophy", label: "Muscle / Hypertrophy" },
  { id: "endurance", label: "Endurance" },
  { id: "general", label: "General fitness" },
  { id: "athletic_performance", label: "Athletic performance" },
] as const;

const MODALITY_LABELS: Record<ExerciseModality, string> = {
  weightlifting: "Weightlifting",
  calisthenics: "Calisthenics",
  cardio: "Cardio",
  plyometrics: "Plyometrics",
  stretching: "Stretching",
};

const STEPS = 5;

export function OnboardingForm({ isRetake = false }: { isRetake?: boolean }) {
  const searchParams = useSearchParams();
  const retake = isRetake || searchParams.get("retake") === "1";
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      goals: [],
      exerciseModalities: [],
      daysPerWeek: 3,
      sessionMinutes: 45,
      experience: "beginner",
      equipment: "gym",
      injuriesNotes: "",
    },
  });

  const goals = form.watch("goals");
  const modalities = form.watch("exerciseModalities");

  async function onSubmit(values: OnboardingFormValues) {
    setSubmitting(true);
    try {
      const result = await submitOnboarding({ ...values, retake });
      if (result?.error) {
        const message =
          "_form" in result.error && Array.isArray(result.error._form)
            ? result.error._form[0]
            : "Could not save onboarding. Please try again.";
        toast.error(message);
      }
    } catch (error) {
      if (isRedirectError(error)) return;
      toast.error("Could not save onboarding. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (step < STEPS - 1) setStep((s) => s + 1);
    else form.handleSubmit(onSubmit)();
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  function toggleGoal(goal: (typeof GOALS)[number]["id"]) {
    const current = form.getValues("goals");
    if (current.includes(goal)) {
      form.setValue(
        "goals",
        current.filter((g) => g !== goal)
      );
    } else {
      form.setValue("goals", [...current, goal]);
    }
  }

  function toggleModality(modality: ExerciseModality) {
    const current = form.getValues("exerciseModalities");
    if (current.includes(modality)) {
      form.setValue(
        "exerciseModalities",
        current.filter((m) => m !== modality)
      );
    } else {
      form.setValue("exerciseModalities", [...current, modality]);
    }
  }

  const continueDisabled =
    submitting ||
    (step === 0 && goals.length === 0) ||
    (step === 1 && modalities.length === 0);

  return (
    <Card className="min-w-0 overflow-x-hidden">
      <CardHeader>
        <CardTitle>Let&apos;s build your plan</CardTitle>
        <Progress value={((step + 1) / STEPS) * 100} className="mt-2 h-2" />
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <Label className="text-base">What are your goals?</Label>
            <div className="grid gap-3">
              {GOALS.map((g) => (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <Checkbox
                    checked={goals.includes(g.id)}
                    onCheckedChange={() => toggleGoal(g.id)}
                  />
                  <span className="font-medium">{g.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Label className="text-base">
              What forms of exercise should we include?
            </Label>
            <p className="text-sm text-muted-foreground">Select all that apply</p>
            <div className="grid gap-3">
              {EXERCISE_MODALITIES.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <Checkbox
                    checked={modalities.includes(m)}
                    onCheckedChange={() => toggleModality(m)}
                  />
                  <span className="font-medium">{MODALITY_LABELS[m]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Days per week</Label>
              <Select
                value={String(form.watch("daysPerWeek"))}
                onValueChange={(v) => {
                  if (v) form.setValue("daysPerWeek", parseInt(v, 10));
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session length (minutes)</Label>
              <Input
                type="number"
                className="h-12"
                {...form.register("sessionMinutes", { valueAsNumber: true })}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Experience</Label>
              <Select
                value={form.watch("experience")}
                onValueChange={(v) => {
                  if (v)
                    form.setValue(
                      "experience",
                      v as OnboardingFormValues["experience"]
                    );
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipment access</Label>
              <Select
                value={form.watch("equipment")}
                onValueChange={(v) => {
                  if (v)
                    form.setValue(
                      "equipment",
                      v as OnboardingFormValues["equipment"]
                    );
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gym">Full gym</SelectItem>
                  <SelectItem value="home">Home / minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2">
            <Label>Injuries or limitations (optional)</Label>
            <Textarea
              placeholder="e.g. shoulder pain — avoid overhead pressing"
              className="min-h-[120px]"
              {...form.register("injuriesNotes")}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {step > 0 && (
            <Button type="button" variant="outline" className="h-12 flex-1" onClick={back}>
              Back
            </Button>
          )}
          <Button
            type="button"
            className="h-12 flex-1 text-base"
            onClick={next}
            disabled={continueDisabled}
          >
            {step === STEPS - 1
              ? submitting
                ? "Building plan..."
                : "Create my plan"
              : "Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
