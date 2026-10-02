markdown

# Workout Tracker — v1 Design

## What it is
A simple web page for logging gym workouts, built to be opened on a phone
at the gym. No accounts, no backend, no fuss.

## v1 does exactly two things
1. **Log a workout** — pick an exercise (or type a new one), add sets of
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
- **Deploy:** Cloudflare Pages, same pipeline as robertnaanos.com. Future
  option: its own subdomain (lifts.robertnaanos.com).

## Screens
1. **Log** (main screen): exercise picker — remembers exercises you've used
   before, or type a new one. Rows of reps/weight inputs, "+ add set",
   Save button.
2. **History:** workouts grouped by date. Tap to expand a workout and see
   all its sets.

## Data shape
One workout is stored like this:
```json
{
  "date": "2026-10-02",
  "exercises": [
    { "name": "Bench Press",
      "sets": [ { "reps": 8, "weight": 135 }, { "reps": 8, "weight": 135 } ] }
  ]
}

Files

    index.html — page structure
    styles.css — looks (mobile-first, big touch targets for gym fingers)
    app.js — logic (render screens, save/load workouts)
    DESIGN.md — this file

Build order

    Page skeleton with both screens (no saving yet).
    Logging works and saves to localStorage.
    History view reads it back.
    Phone polish, then deploy.
