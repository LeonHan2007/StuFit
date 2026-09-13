import { WEEKDAY_NAMES } from "@/lib/plan/build-seven-day-week";
import type { GeneratorParams } from "@/lib/plan/templates/types";

export interface CatalogExerciseForPrompt {
  slug: string;
  name: string;
  category: string;
  equipment: string;
}

export function buildSystemPrompt(): string {
  return `You are an expert strength and conditioning coach creating personalized weekly workout plans for students.

You MUST respond with valid JSON only, matching this exact shape:
{
  "planName": string,
  "days": [
    {
      "label": string,
      "isRestDay": boolean (optional — true for rest days),
      "exercises": [
        {
          "slug": string,
          "sets": number,
          "repsMin": number,
          "repsMax": number,
          "restSeconds": number
        }
      ]
    }
  ]
}

Rules:
- Use ONLY exercise slugs from the provided whitelist. Never invent slugs.
- Return exactly 7 days in the "days" array, in order Monday through Sunday (index 0 = Monday).
- Include exactly the requested number of TRAINING days; all other days must be rest days.
- Rest days: set "isRestDay": true, label e.g. "Rest", and "exercises": [].
- Training days: omit isRestDay or set false; include exercises.
- Blend the user's selected exercise modalities across training days.
- Respect equipment: home users may only use bodyweight, dumbbell, band, kettlebell equipment types.
- Honor injury/limitation notes — avoid aggravating movements and suggest alternatives from the whitelist.
- Fit total work within the session duration (approximate sets × work + rest).
- Order exercises logically: power/plyometrics early when fresh, compounds, accessories, cardio, stretching as finishers.

Prescription semantics by category:
- weightlifting / calisthenics: repsMin/repsMax are repetition counts.
- cardio: repsMin and repsMax represent WORK DURATION IN SECONDS per set (e.g. 30–60).
- stretching: repsMin/repsMax are HOLD DURATION IN SECONDS (often equal, e.g. 30–30).
- plyometrics: low reps (3–8), explosive, longer rest (90–180s).
- athletic_performance goals: include power, agility, and mixed-modal work where modalities allow.
- When revision requests conflict with the previous plan, prioritize the revision requests while staying within the whitelist and equipment rules.`;
}

function formatPreviousPlan(params: GeneratorParams): string {
  if (!params.previousPlan?.days.length) return "";

  return `
Current proposed plan (revise based on athlete feedback below):
${JSON.stringify(params.previousPlan, null, 2)}
`;
}

function formatRevisionBlock(params: GeneratorParams): string {
  const notes = params.revisionNotes?.trim();
  if (!notes) return "";

  return `
Athlete revision requests (apply strictly — adjust exercise selection, volume, and day structure):
${notes}
`;
}

export function buildUserPrompt(
  params: GeneratorParams,
  catalog: CatalogExerciseForPrompt[]
): string {
  const modalities = params.exerciseModalities.join(", ");
  const goals = params.goals.join(", ");
  const isRevision = Boolean(params.revisionNotes?.trim());
  const restDays = 7 - params.daysPerWeek;
  const weekdayGuide = WEEKDAY_NAMES.map(
    (name, i) => `  days[${i}] = ${name}`
  ).join("\n");

  return `${isRevision ? "Revise" : "Create"} a workout plan for this athlete:

Goals: ${goals}
Exercise modalities to include: ${modalities}
Training days per week: ${params.daysPerWeek}
Rest days per week: ${restDays}
Session length (minutes): ${params.sessionMinutes}
Experience: ${params.experience}
Equipment access: ${params.equipment}
Injuries / limitations: ${params.injuriesNotes?.trim() || "None"}
${formatPreviousPlan(params)}${formatRevisionBlock(params)}
When the athlete asks to add or increase a modality (e.g. cardio), include at least one exercise from that category on most training days using slugs from the whitelist.

Return exactly 7 days in the "days" array (Monday–Sunday):
${weekdayGuide}

Exactly ${params.daysPerWeek} training days with exercises; exactly ${restDays} rest days with isRestDay: true and exercises: [].
Spread training days across the week (avoid back-to-back overload when possible).
Training day labels should be descriptive (e.g. "Full Body A", "Lower Power").
${isRevision ? "Honor the revision requests" : ""}

Exercise whitelist (slug, name, category, equipment):
${JSON.stringify(catalog, null, 2)}`;
}
