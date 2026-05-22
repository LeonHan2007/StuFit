# StuFit

End-to-end student workout web app — plan workouts, log sets in real time, track streaks, and sync with Google Calendar. Built with **Next.js 15**, **Supabase**, and **Vercel** (all free-tier friendly).

## Features

- **Auth** — Google OAuth + email magic link (Supabase Auth)
- **Onboarding** — questionnaire → Gemini-powered workout plan (template fallback)
- **Exercise catalog** — weightlifting, calisthenics, cardio, plyometrics, stretching (grouped picker)
- **Live workouts** — exercise cards with technique guides + YouTube embeds, set logging, rest timer
- **Dashboard** — streaks, weekly progress, volume chart (Recharts)
- **History** — past sessions with set breakdown
- **Google Calendar** — schedule workouts in free slots (separate OAuth)

## Prerequisites

- Node.js 20+
- [Docker](https://docs.docker.com/get-docker/) — **optional**; only needed for `supabase start` / `supabase db reset` locally
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase` or use project devDependency) — for remote `db push` (no Docker)

## Quick start (local)

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

After starting Supabase locally, fill in values from `supabase status`:

```bash
supabase start
supabase status
```

Default local anon key (demo):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### 3. Database

**Option A — local (requires Docker):**

```bash
supabase start
supabase db reset
```

This runs migrations and seeds 50+ exercises.

**Option B — hosted Supabase only (no Docker):** see [Apply migrations without Docker](#apply-migrations-without-docker) below.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Auth providers (local)

In [Supabase Studio](http://127.0.0.1:54323) → Authentication → Providers:

- Enable **Email** (magic link)
- Enable **Google** — add OAuth client ID/secret from Google Cloud Console

Add redirect URL: `http://localhost:3000/auth/callback`

## Google Calendar (optional)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Calendar API**
3. Create OAuth 2.0 credentials (Web application)
4. Authorized redirect URI: `http://localhost:3000/api/google/callback`
5. Set in `.env.local`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Calendar connect is separate from login — use **Settings → Calendar** in the app.

## Project structure

```
src/
  app/           # Routes (App Router)
  components/    # UI + workout components
  lib/           # Supabase, plan generator, calendar, validations
  types/         # Domain types
supabase/
  migrations/    # Schema + RLS
  seed.sql       # Exercise catalog
```

## Deployment

### Supabase Cloud

See [Apply migrations without Docker](#apply-migrations-without-docker).

Enable Auth providers and add production redirect URLs:

- `https://your-domain.com/auth/callback`
- `https://your-domain.com/api/google/callback`

### Vercel

1. Import repo on [Vercel](https://vercel.com)
2. Add environment variables from `.env.local.example`
3. Deploy

Set `NEXT_PUBLIC_APP_URL` to your production URL.

Optional: set `GEMINI_API_KEY` (Google AI Studio) for AI workout plans on onboarding. Without it, deterministic templates are used.

## Apply migrations without Docker

Use this if you run **Supabase Cloud** (or any remote Postgres) and do not want `supabase start` / `db reset`.

### 1. Link the project (one time)

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Find `YOUR_PROJECT_REF` in the Supabase dashboard → Project Settings → General.

### 2. Push migrations (no Docker)

```bash
npx supabase db push
```

This applies every file in `supabase/migrations/` that is not yet on the remote database, including `20260520180000_social_and_rest_days.sql` (profiles, friendships, rest days, avatars bucket).

### 3. Seed exercises (optional)

In the dashboard **SQL Editor**, run the contents of [`supabase/seed.sql`](supabase/seed.sql) if the exercise catalog is empty.

### Alternative: SQL Editor only

1. Supabase dashboard → **SQL Editor** → New query  
2. Paste the full contents of [`supabase/migrations/20260520180000_social_and_rest_days.sql`](supabase/migrations/20260520180000_social_and_rest_days.sql)  
3. Run  

Then run earlier migrations in order if this is a fresh project (`20260520140000_initial_schema.sql` through `20260520170000_exercise_modalities.sql`, then `20260520180000_social_and_rest_days.sql`).

Point `.env.local` at the cloud project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx supabase db push` | Apply migrations to **linked remote** project (no Docker) |
| `supabase start` | Local Supabase stack (Docker) |
| `supabase db reset` | Reset local DB + migrate + seed (Docker) |

## Security notes

- RLS enabled on all tables
- `SUPABASE_SERVICE_ROLE_KEY` only used in server route handlers (Calendar token storage)
- Never expose service role key to the client
- Calendar refresh tokens stored server-side via service role

## License

MIT
