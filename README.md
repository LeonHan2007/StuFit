# StuFit

StuFit is an end-to-end workout companion for students, built to make it easy to plan, log, and stay consistent with training.

Built with **Next.js 15**, **Supabase**, and deployed on **Vercel**.

🔗 [stufit.vercel.app](https://stufit.vercel.app)

## What it does

When you sign up, StuFit walks you through a short onboarding questionnaire and generates a personalized workout plan. From there, the app becomes your daily training hub:

- **Plan your week** — a generated plan based on your goals and experience level
- **Log workouts live** — exercise cards with technique guides, embedded YouTube demos, set-by-set logging, and a built-in rest timer keep you moving without breaking focus
- **Browse the exercise catalog** — a grouped library covering weightlifting, calisthenics, cardio, plyometrics, and stretching
- **Track progress** — a dashboard shows streaks, weekly progress, and training volume over time via charts
- **Review history** — every past session is saved with a full set-by-set breakdown
- **Schedule around your life** — connect Google Calendar to automatically slot workouts into your free time

## Why it exists

StuFit is aimed at students who want structure without friction. Instead of guessing what to do at the gym or losing track of progress across notes apps, StuFit centralizes planning, logging, and progress tracking in one app.

## How you sign in

Auth is handled via Supabase, supporting both Google OAuth and email magic links — no passwords to manage.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend/framework | Next.js 15 (App Router) |
| Backend/database | Supabase (Postgres, Auth, RLS) |
| AI plan generation | Gemini API (optional, with template fallback) |
| Charts | Recharts |
| Calendar sync | Google Calendar API |
| Hosting | Vercel |

## Security

- Row-Level Security (RLS) is enabled on every table
- The Supabase service role key is only ever used in server-side route handlers (for Calendar token storage) and is never exposed to the client
- Google Calendar refresh tokens are stored server-side only

## License

MIT
