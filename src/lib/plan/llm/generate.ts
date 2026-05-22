import "server-only";

import type { GeneratorParams } from "@/lib/plan/templates/types";
import { HOME_EQUIPMENT } from "@/lib/exercises/constants";
import type { ExerciseModality } from "@/types/database";
import {
  effectiveModalitiesForRevision,
  equipmentMatchesExclude,
  parseRevisionRules,
} from "@/lib/plan/revision-rules";
import { buildSystemPrompt, buildUserPrompt, type CatalogExerciseForPrompt } from "./prompt";
import { llmWorkoutPlanSchema, type LlmWorkoutPlan } from "./schema";

/** Ordered by reliability for Google AI Studio free tier (May 2026). */
const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
] as const;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string; code?: number };
}

function readApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY?.trim();
  if (!raw) return null;
  return raw.replace(/^['"]|['"]$/g, "");
}

function filterCatalogForPrompt(
  catalog: CatalogExerciseForPrompt[],
  params: GeneratorParams
): CatalogExerciseForPrompt[] {
  const revisionRules = params.revisionNotes
    ? parseRevisionRules(params.revisionNotes)
    : { excludeEquipment: [], preferCategories: [] };

  const modalitySet = effectiveModalitiesForRevision(
    params,
    revisionRules
  ) as Set<ExerciseModality>;

  return catalog.filter((ex) => {
    if (!modalitySet.has(ex.category as ExerciseModality)) return false;
    if (params.equipment === "home" && !isHomeAllowedEquipment(ex.equipment)) {
      return false;
    }
    if (
      equipmentMatchesExclude(ex.equipment, revisionRules.excludeEquipment)
    ) {
      return false;
    }
    return true;
  });
}

function isHomeAllowedEquipment(equipment: string): boolean {
  return HOME_EQUIPMENT.has(equipment);
}

function sanitizePlan(
  plan: LlmWorkoutPlan,
  allowedSlugs: Set<string>,
  params: GeneratorParams,
  equipmentBySlug: Map<string, string>
): LlmWorkoutPlan | null {
  if (plan.days.length !== 7) {
    return null;
  }

  const sanitizedDays = plan.days.map((day) => {
    if (day.isRestDay) {
      return { ...day, exercises: [] as typeof day.exercises };
    }

    const exercises = day.exercises.filter((slot) => {
      if (!allowedSlugs.has(slot.slug)) return false;
      if (params.equipment === "home") {
        const equipment = equipmentBySlug.get(slot.slug);
        if (!equipment || !isHomeAllowedEquipment(equipment)) return false;
      }
      return true;
    });

    return { ...day, exercises };
  });

  const trainingDays = sanitizedDays.filter((d) => !d.isRestDay);
  const restDays = sanitizedDays.filter((d) => d.isRestDay);

  if (trainingDays.length !== params.daysPerWeek) {
    return null;
  }
  if (restDays.length !== 7 - params.daysPerWeek) {
    return null;
  }
  if (trainingDays.some((d) => d.exercises.length === 0)) {
    return null;
  }
  if (restDays.some((d) => d.exercises.length > 0)) {
    return null;
  }

  return { planName: plan.planName, days: sanitizedDays };
}

interface GeminiCallResult {
  text: string | null;
  error?: string;
}

async function callGeminiModel(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<GeminiCallResult> {
  const url = `${GEMINI_BASE}/${model}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    });

    const body = (await res.json()) as GeminiResponse;

    if (!res.ok) {
      const msg =
        body.error?.message ?? `HTTP ${res.status} from Gemini (${model})`;
      console.error(`[llm] Gemini ${model} error:`, res.status, msg);
      return { text: null, error: msg };
    }

    const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    if (!text) {
      return { text: null, error: `Empty response from ${model}` };
    }
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Request failed";
    console.error(`[llm] Gemini ${model} failed:`, msg);
    return { text: null, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(
  params: GeneratorParams,
  catalog: CatalogExerciseForPrompt[]
): Promise<{ text: string | null; lastError?: string }> {
  const apiKey = readApiKey();
  if (!apiKey) return { text: null, lastError: "GEMINI_API_KEY is not set" };

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(params, catalog);

  let lastError: string | undefined;

  for (const model of GEMINI_MODELS) {
    const result = await callGeminiModel(
      apiKey,
      model,
      systemPrompt,
      userPrompt
    );
    if (result.text) return { text: result.text };
    lastError = result.error;
  }

  return { text: null, lastError };
}

function parseAndValidate(text: string): LlmWorkoutPlan | null {
  try {
    const raw: unknown = JSON.parse(text);
    const parsed = llmWorkoutPlanSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("[llm] Zod validation failed:", parsed.error.flatten());
      return null;
    }
    return parsed.data;
  } catch {
    console.error("[llm] JSON parse failed");
    return null;
  }
}

export type LlmGenerateFailure =
  | "no_api_key"
  | "api_error"
  | "empty_catalog"
  | "invalid_response"
  | "validation_failed";

export interface LlmGenerateResult {
  plan: LlmWorkoutPlan | null;
  failure?: LlmGenerateFailure;
  detail?: string;
}

export async function generateLlmWorkoutPlan(
  params: GeneratorParams,
  fullCatalog: CatalogExerciseForPrompt[]
): Promise<LlmWorkoutPlan | null> {
  const result = await generateLlmWorkoutPlanWithMeta(params, fullCatalog);
  return result.plan;
}

export async function generateLlmWorkoutPlanWithMeta(
  params: GeneratorParams,
  fullCatalog: CatalogExerciseForPrompt[]
): Promise<LlmGenerateResult> {
  const apiKey = readApiKey();
  if (!apiKey) {
    return { plan: null, failure: "no_api_key", detail: "GEMINI_API_KEY is not set in .env.local" };
  }

  const catalog = filterCatalogForPrompt(fullCatalog, params);
  if (catalog.length === 0) {
    console.error("[llm] No exercises in whitelist after filtering");
    return {
      plan: null,
      failure: "empty_catalog",
      detail:
        "No exercises match your settings. Include cardio in onboarding or ask to add a modality we support.",
    };
  }

  const allowedSlugs = new Set(catalog.map((e) => e.slug));
  const equipmentBySlug = new Map(catalog.map((e) => [e.slug, e.equipment]));

  let lastFailure: LlmGenerateFailure = "api_error";
  let lastDetail: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, lastError } = await callGemini(params, catalog);
    if (!text) {
      lastFailure = "api_error";
      lastDetail = lastError;
      continue;
    }

    const plan = parseAndValidate(text);
    if (!plan) {
      lastFailure = "invalid_response";
      lastDetail = "AI returned invalid JSON";
      continue;
    }

    const sanitized = sanitizePlan(plan, allowedSlugs, params, equipmentBySlug);
    if (sanitized) return { plan: sanitized };

    lastFailure = "validation_failed";
    lastDetail = "AI plan used exercises outside your allowed list";
  }

  const detail =
    lastDetail ??
    (lastFailure === "api_error"
      ? "All Gemini models failed. Your key may be invalid or over quota — try gemini-2.5-flash in Google AI Studio."
      : "AI returned a plan we could not validate.");

  return { plan: null, failure: lastFailure, detail };
}
