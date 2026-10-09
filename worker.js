// The Worker behind lifts.robertnaanos.com.
// Requests to /api/* are answered here, from the D1 database (env.DB).
// Everything else is the static site in the public folder.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }
    return env.ASSETS.fetch(request);   // static site
  }
};

// ==================== Routing ====================

// Each API route, and the function that answers each method on it.
const ROUTES = {
  "/api/log/strength": { POST: logStrength },
  "/api/log/cardio": { POST: logCardio },
  "/api/history": { GET: getHistory },
  "/api/exercises": { GET: getExercises, POST: addExercise }
};

async function handleApi(request, env, url) {
  // Every API route needs the key. API_KEY is a Worker secret (set with
  // `npx wrangler secret put API_KEY`), never written in code.
  if (!env.API_KEY) {
    // Fail closed: with no key configured, nobody gets in.
    return Response.json({ error: "API_KEY is not configured" }, { status: 500 });
  }
  if (!sameKey(request.headers.get("x-api-key") || "", env.API_KEY)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const route = ROUTES[url.pathname];
  if (!route) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const handler = route[request.method];
  if (!handler) {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    return await handler(request, env, url);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// Compare two strings without leaking, through timing, how much of the
// key was right.
function sameKey(given, expected) {
  const encoder = new TextEncoder();
  const a = encoder.encode(given);
  const b = encoder.encode(expected);
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  return crypto.subtle.timingSafeEqual(a, b);
}

// ==================== Helpers ====================

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}

// Read the request body as a JSON object. Returns null if it isn't one.
async function readBody(request) {
  try {
    const body = await request.json();
    return body !== null && typeof body === "object" ? body : null;
  } catch (error) {
    return null;
  }
}

// True for a field that was left out (or sent as null).
function isMissing(value) {
  return value === undefined || value === null;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

// Checks for the fields both log routes share. Returns an error message,
// or null if they are fine.
//   id         — optional, made by the client so a retried request can't add
//                a duplicate row (INSERT OR IGNORE skips an id it already has)
//   created_at — optional, shared by every row from one tap of "Save workout"
//                so history can group them back together
function checkCommonFields(body) {
  if (typeof body.date !== "string" || !DATE_PATTERN.test(body.date)) {
    return "date must be YYYY-MM-DD";
  }
  if (typeof body.exercise !== "string" || body.exercise.trim() === "" || body.exercise.length > 100) {
    return "exercise must be a name";
  }
  if (!isMissing(body.id) && (typeof body.id !== "string" || body.id === "" || body.id.length > 64)) {
    return "id must be a short string";
  }
  if (!isMissing(body.created_at) && (typeof body.created_at !== "string" || isNaN(Date.parse(body.created_at)))) {
    return "created_at must be an ISO 8601 timestamp";
  }
  return null;
}

// ==================== Routes ====================

// POST /api/log/strength
// Body: { id?, date, exercise, sets, reps, weight, created_at? }
// The app sends one call per set, with sets = 1.
async function logStrength(request, env) {
  const body = await readBody(request);
  if (body === null) {
    return badRequest("Body must be a JSON object");
  }
  const problem = checkCommonFields(body);
  if (problem) {
    return badRequest(problem);
  }
  if (!isPositiveInteger(body.sets) || !isPositiveInteger(body.reps)) {
    return badRequest("sets and reps must be whole numbers above 0");
  }
  if (typeof body.weight !== "number" || !(body.weight >= 0)) {
    return badRequest("weight must be a number, 0 or more");
  }

  const id = body.id || crypto.randomUUID();
  const createdAt = body.created_at || new Date().toISOString();

  await env.DB
    .prepare("INSERT OR IGNORE INTO strength_logs (id, date, exercise, sets, reps, weight, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, body.date, body.exercise.trim(), body.sets, body.reps, body.weight, createdAt)
    .run();

  return Response.json({ id: id }, { status: 201 });
}

// POST /api/log/cardio
// Body: { id?, date, exercise, duration_min, distance_mi?, jumps?, created_at? }
// Pace is worked out here, not sent by the client.
async function logCardio(request, env) {
  const body = await readBody(request);
  if (body === null) {
    return badRequest("Body must be a JSON object");
  }
  const problem = checkCommonFields(body);
  if (problem) {
    return badRequest(problem);
  }
  if (typeof body.duration_min !== "number" || !(body.duration_min > 0)) {
    return badRequest("duration_min must be a number above 0");
  }
  if (!isMissing(body.distance_mi) && (typeof body.distance_mi !== "number" || !(body.distance_mi >= 0))) {
    return badRequest("distance_mi must be a number, 0 or more");
  }
  if (!isMissing(body.jumps) && !(Number.isInteger(body.jumps) && body.jumps >= 0)) {
    return badRequest("jumps must be a whole number, 0 or more");
  }

  const id = body.id || crypto.randomUUID();
  const createdAt = body.created_at || new Date().toISOString();

  // Names are stored lowercase with underscores: "Jump Rope" → "jump_rope".
  const exercise = body.exercise.trim().toLowerCase().replace(/\s+/g, "_");
  // No distance (missing or 0) is stored as NULL, and then there is no pace.
  const distance = body.distance_mi > 0 ? body.distance_mi : null;
  const pace = distance === null ? null : body.duration_min / distance;
  const jumps = isMissing(body.jumps) ? null : body.jumps;

  await env.DB
    .prepare("INSERT OR IGNORE INTO cardio_logs (id, date, exercise, duration_min, distance_mi, pace_min_per_mi, jumps, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, body.date, exercise, body.duration_min, distance, pace, jumps, createdAt)
    .run();

  return Response.json({ id: id }, { status: 201 });
}

// GET /api/history?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns { strength: [...], cardio: [...] }, oldest first. Both "from"
// and "to" are optional; leave them out to get everything.
async function getHistory(request, env, url) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if ((from !== null && !DATE_PATTERN.test(from)) || (to !== null && !DATE_PATTERN.test(to))) {
    return badRequest("from and to must be YYYY-MM-DD");
  }

  // Dates are text, so these two stand in for "no limit" at either end.
  const first = from || "0000-00-00";
  const last = to || "9999-99-99";

  // rowid is the order the rows were inserted in, which keeps the sets of
  // one exercise (same created_at) in the order they were logged.
  const strength = await env.DB
    .prepare("SELECT id, date, exercise, sets, reps, weight, created_at FROM strength_logs WHERE date >= ? AND date <= ? ORDER BY date, created_at, rowid")
    .bind(first, last)
    .all();
  const cardio = await env.DB
    .prepare("SELECT id, date, exercise, duration_min, distance_mi, pace_min_per_mi, jumps, created_at FROM cardio_logs WHERE date >= ? AND date <= ? ORDER BY date, created_at, rowid")
    .bind(first, last)
    .all();

  return Response.json({ strength: strength.results, cardio: cardio.results });
}

// GET /api/exercises — returns the custom exercise names, as [names].
// (Not used by the app yet: it has no custom-exercise screen right now.)
async function getExercises(request, env) {
  const rows = await env.DB
    .prepare("SELECT name FROM custom_exercises ORDER BY name")
    .all();

  return Response.json(rows.results.map(function (row) {
    return row.name;
  }));
}

// POST /api/exercises — body { name }, adds a custom exercise.
async function addExercise(request, env) {
  const body = await readBody(request);
  const name = body !== null && typeof body.name === "string" ? body.name.trim() : "";
  if (name === "" || name.length > 100) {
    return badRequest("name must be a name");
  }

  // OR IGNORE: adding a name that is already there is not an error.
  await env.DB
    .prepare("INSERT OR IGNORE INTO custom_exercises (name) VALUES (?)")
    .bind(name)
    .run();

  return Response.json({ name: name }, { status: 201 });
}
