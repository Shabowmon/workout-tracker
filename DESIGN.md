# Workout Tracker — v1 Design

## What it is
A simple web page for logging gym workouts, built to be opened on a phone
at the gym. No accounts, no backend, no fuss.

## v1 does exactly two things
1. **Log a workout** — pick an exercise, add sets of
   reps × weight, hit save.
2. **View history** — past workouts listed by date, newest first. Tap one
   to see every set.

Everything else — charts, progression suggestions, rest timers, accounts,
syncing between devices — is v2 or later. If it's not on this list, we
don't build it yet.

## How it's built
- **Plain HTML + CSS + JavaScript.** No framework. Every line stays readable
  while you're learning, and it runs anywhere.
- **Data lives in the browser (localStorage).** No server, no database, no
  login. Works on bad gym wifi, and your data never leaves your phone.
  Known limit: history is tied to one browser. A real backend comes later
  if you ever want sync.
- **Deploy:** a Cloudflare Worker with static assets, at
  lifts.robertnaanos.com. `npx wrangler deploy` publishes it.

## Backend (added after v1)
- **Cloudflare Worker + D1.** `worker.js` answers the `/api/*` routes and
  stores history in a D1 database bound as `DB` (see `wrangler.toml`).
  Every request needs an `x-api-key` header matching the `API_KEY` Worker
  secret. The key is typed into the app once per phone; it is never
  written in the code.
- **localStorage is still written on every save.** It is the offline
  fallback for the History screen. Rows that haven't reached the server
  wait in an outbox and are retried the next time the app opens.
- **localStorage keys:** `workouts` (below), `outbox`, `apiKey`, and
  `migration` (the one-time "Upload my existing history" button).

## Screens
1. **Log** (main screen): exercise picker — a dropdown grouped by muscle
   group (edit the EXERCISES list in app.js to match your program). Rows
   of reps/weight inputs with a × to
   remove a row, "+ add set", Save button. Exercises in the "Cardio"
   group swap the set rows for a single Duration (min) / Distance (mi) row.
2. **History:** workouts grouped by date. Tap to expand a workout and see
   all its sets.

## Data shape
One workout is stored like this:
```json
{
  "date": "2026-10-02",
  "exercises": [
    { "name": "Bench Press", "createdAt": "2026-10-02T17:04:11.000Z",
      "sets": [ { "id": "…", "reps": 8, "weight": 135 }, { "id": "…", "reps": 8, "weight": 135 } ] },
    { "id": "…", "name": "Running", "createdAt": "2026-10-02T17:30:42.000Z",
      "duration": 30, "distance": 3.1 }
  ]
}

Files

    public/index.html — page structure
    public/styles.css — looks (mobile-first, big touch targets for gym fingers)
    public/app.js — logic (render screens, save/load workouts, sync)
    worker.js — the API (only the public folder is served as the site)
    wrangler.toml — Worker settings
    DESIGN.md — this file

Build order

    Page skeleton with both screens (no saving yet).
    Logging works and saves to localStorage.
    History view reads it back.
    Phone polish, then deploy.
