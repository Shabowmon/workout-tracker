// Workout Tracker — logging saves to localStorage and to the server
// (/api, see worker.js). The History screen reads the server's
// copy, and falls back to localStorage when the server can't be reached.

// ==================== EXERCISES ====================

// Edit this list to match your program.
// Each line is one muscle group (a heading in the dropdown) followed by
// the exercises listed under it.
const EXERCISES = {
  "Cardio": ["Running", "Biking"],
  "Chest": ["Bench Press", "Cable Flys", "Push-Ups"],
  "Back": ["Pull-Ups", "Barbell Row","Lat Pulldown", "Cable Row"],
  "Legs": ["Squat", "Romanian Deadlift", "Calf Raise"],
  "Shoulders": ["Overhead Press", "Lateral Raise", "Face Pull"],
  "Arms": ["Dumbbell Curl", "Hammer Curl", "Tricep Pushdown", "Overhead Tricep Extension"],
  "Core": ["Plank", "Hanging Leg Raise", "Cable Crunch"]
};

// Exercises in this group are logged as duration + distance instead of
// sets of reps × weight.
const CARDIO_GROUP = "Cardio";

// ==================== Screen switching ====================

// Grab every tab button and every screen once, up front.
const tabs = document.querySelectorAll(".tab");
const screens = document.querySelectorAll(".screen");

// Show the screen with the given id and hide the others.
function showScreen(screenId) {
  // The "hidden" attribute hides an element; set it on every screen but one.
  screens.forEach(function (screen) {
    screen.hidden = screen.id !== screenId;
  });

  // Highlight the tab that belongs to the visible screen.
  tabs.forEach(function (tab) {
    tab.classList.toggle("active", tab.dataset.screen === screenId);
  });
}

// When a tab is tapped, show the screen named in its data-screen attribute.
tabs.forEach(function (tab) {
  tab.addEventListener("click", function () {
    showScreen(tab.dataset.screen);
  });
});

// ==================== Storage ====================

// Workouts are stored under this localStorage key, as a JSON array of
// workouts in the shape described in DESIGN.md.
const STORAGE_KEY = "workouts";

// Read all saved workouts. Returns an empty array if nothing is saved yet.
function loadWorkouts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

// Write the full list of workouts back to localStorage.
function storeWorkouts(workouts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

// Today's date as "YYYY-MM-DD", using the phone's own time zone.
// (toISOString() would use UTC, which can be a day off late at night.)
function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// ==================== Log screen ====================

const STARTING_SETS = 3;   // how many empty set rows the form starts with

const exerciseSelect = document.getElementById("exercise-select");
const strengthFields = document.getElementById("strength-fields");
const setList = document.getElementById("set-list");
const addSetButton = document.getElementById("add-set");
const cardioFields = document.getElementById("cardio-fields");
const durationInput = document.getElementById("cardio-duration");
const distanceInput = document.getElementById("cardio-distance");
const saveButton = document.getElementById("save-workout");
const saveMessage = document.getElementById("save-message");

// ---------- Exercise picker ----------

// Add one <option> to the dropdown (or to a group inside it).
function addOption(parent, value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  parent.appendChild(option);
}

// Add one <optgroup> (a heading with exercises under it) to the dropdown.
function addGroup(label, names) {
  const group = document.createElement("optgroup");
  group.label = label;
  names.forEach(function (name) {
    addOption(group, name, name);
  });
  exerciseSelect.appendChild(group);
}

// Build the dropdown: a "choose" prompt, then the EXERCISES list from
// the top of this file.
function renderExerciseSelect() {
  exerciseSelect.innerHTML = "";
  addOption(exerciseSelect, "", "Choose an exercise…");

  for (const muscleGroup in EXERCISES) {
    addGroup(muscleGroup, EXERCISES[muscleGroup]);
  }
}

// True if the given name is one of the Cardio exercises.
function isCardio(name) {
  return EXERCISES[CARDIO_GROUP].includes(name);
}

// Show the duration/distance row for a Cardio exercise, and the set rows
// (with "+ Add set") for everything else.
function updateFields() {
  const cardio = isCardio(exerciseSelect.value);
  cardioFields.hidden = !cardio;
  strengthFields.hidden = cardio;
  addSetButton.hidden = cardio;
}

// Choosing an exercise shows the right inputs for it (sets or cardio).
exerciseSelect.addEventListener("change", updateFields);

// ---------- Set rows ----------

// Append one empty reps × weight row to the form.
function addSetRow() {
  const number = setList.children.length + 1;

  const row = document.createElement("div");
  row.className = "set-row";
  row.innerHTML =
    '<span class="set-number">' + number + "</span>" +
    '<input class="number-input reps-input" type="text" inputmode="numeric" placeholder="0" aria-label="Set ' + number + ' reps">' +
    '<span class="times">×</span>' +
    '<input class="number-input weight-input" type="text" inputmode="decimal" placeholder="0" aria-label="Set ' + number + ' weight">' +
    '<button class="remove-set" type="button" aria-label="Remove set ' + number + '">×</button>';

  // Tapping the × removes this row, then renumbers the rows that are left.
  row.querySelector(".remove-set").addEventListener("click", function () {
    row.remove();
    renumberSets();
  });

  setList.appendChild(row);
}

// After a row is removed, make the set numbers count 1, 2, 3... again.
function renumberSets() {
  const rows = setList.querySelectorAll(".set-row");
  rows.forEach(function (row, index) {
    const number = index + 1;
    row.querySelector(".set-number").textContent = number;
    // Keep the screen-reader labels in step with the visible number.
    row.querySelector(".reps-input").setAttribute("aria-label", "Set " + number + " reps");
    row.querySelector(".weight-input").setAttribute("aria-label", "Set " + number + " weight");
    row.querySelector(".remove-set").setAttribute("aria-label", "Remove set " + number);
  });
}

// Clear the form back to its starting state: no exercise chosen, a few
// empty rows.
function resetForm() {
  exerciseSelect.value = "";   // back to "Choose an exercise…"
  updateFields();
  durationInput.value = "";
  distanceInput.value = "";
  setList.innerHTML = "";
  for (let i = 0; i < STARTING_SETS; i++) {
    addSetRow();
  }
}

// Show a message under the Save button. isError turns it red.
function showMessage(text, isError) {
  saveMessage.textContent = text;
  saveMessage.classList.toggle("error", isError);
}

// Read the set rows into an array like [{ id: "…", reps: 8, weight: 135 }, ...].
// Rows with reps left blank are skipped. A blank weight counts as 0
// (bodyweight exercises). Returns null if a row has something that
// isn't a sensible number.
function readSets() {
  const sets = [];
  const rows = setList.querySelectorAll(".set-row");

  for (const row of rows) {
    const repsText = row.querySelector(".reps-input").value.trim();
    // Some keyboards type a decimal comma ("62,5"), so turn it into a dot.
    const weightText = row.querySelector(".weight-input").value.trim().replace(",", ".");

    if (repsText === "") {
      continue;   // unused row
    }

    const reps = Number(repsText);
    const weight = weightText === "" ? 0 : Number(weightText);

    // Number("abc") gives NaN, which fails both of these checks.
    const repsOk = Number.isInteger(reps) && reps > 0;
    const weightOk = weight >= 0;
    if (!repsOk || !weightOk) {
      return null;
    }

    // The id lets the server spot a set it has already been sent.
    sets.push({ id: crypto.randomUUID(), reps: reps, weight: weight });
  }

  return sets;
}

// Read the cardio row into an object like { duration: 30, distance: 3.1 }
// (minutes and miles). A blank distance counts as 0. Returns undefined if
// the duration is blank, and null if something isn't a sensible number.
function readCardio() {
  // Some keyboards type a decimal comma ("3,1"), so turn it into a dot.
  const durationText = durationInput.value.trim().replace(",", ".");
  const distanceText = distanceInput.value.trim().replace(",", ".");

  if (durationText === "") {
    return undefined;
  }

  const duration = Number(durationText);
  const distance = distanceText === "" ? 0 : Number(distanceText);

  // Number("abc") gives NaN, which fails both of these checks.
  if (!(duration > 0) || !(distance >= 0)) {
    return null;
  }

  return { duration: duration, distance: distance };
}

// Save the exercise on the form into today's workout.
function saveWorkout() {
  const name = exerciseSelect.value;
  if (name === "") {
    showMessage("Choose an exercise.", true);
    return;
  }

  // What gets stored for this exercise, and what the "Saved" message says.
  let entry;
  let savedText;

  if (isCardio(name)) {
    const cardio = readCardio();
    if (cardio === null) {
      showMessage("Duration and distance need to be numbers.", true);
      return;
    }
    if (cardio === undefined) {
      showMessage("Fill in the duration.", true);
      return;
    }
    entry = { id: crypto.randomUUID(), name: name, duration: cardio.duration, distance: cardio.distance };
    savedText = formatCardio(entry).join(", ");
  } else {
    const sets = readSets();
    if (sets === null) {
      showMessage("Reps and weight need to be numbers.", true);
      return;
    }
    if (sets.length === 0) {
      showMessage("Fill in at least one set.", true);
      return;
    }
    entry = { name: name, sets: sets };
    savedText = sets.length + (sets.length === 1 ? " set" : " sets");
  }

  // Every row from this one tap shares this timestamp, so the server's
  // history can group them back into one exercise.
  entry.createdAt = new Date().toISOString();

  // One workout per date: if today already has a workout, add this
  // exercise to it. Otherwise start a new workout for today.
  const workouts = loadWorkouts();
  const today = todayString();
  let workout = workouts.find(function (w) {
    return w.date === today;
  });
  if (!workout) {
    workout = { date: today, exercises: [] };
    workouts.push(workout);
  }
  workout.exercises.push(entry);

  // localStorage can refuse to save (storage full, or blocked by the
  // browser), so only say "Saved" if it really worked.
  try {
    storeWorkouts(workouts);
    queueRows(rowsForEntry(today, entry));   // waiting to go to the server
  } catch (error) {
    showMessage("Couldn't save — browser storage is full or blocked.", true);
    return;
  }

  showMessage("Saved " + name + " — " + savedText, false);
  resetForm();
  renderHistory();
  sync();   // send it to the server in the background
}

addSetButton.addEventListener("click", addSetRow);
saveButton.addEventListener("click", saveWorkout);

// ==================== History screen ====================

const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");

// Turn a stored date like "2026-10-02" into something like "Fri, Oct 2".
function formatDate(dateString) {
  // Build the date from its parts so it's read in the phone's time zone.
  // (new Date("2026-10-02") would be read as UTC and can show the day before.)
  const parts = dateString.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

  const options = { weekday: "short", month: "short", day: "numeric" };
  // Only show the year for workouts from an earlier year.
  if (date.getFullYear() !== new Date().getFullYear()) {
    options.year = "numeric";
  }
  return date.toLocaleDateString(undefined, options);
}

// Turn one set into text like "8 × 135 lb". A weight of 0 (bodyweight)
// is shown as just "8 reps".
function formatSet(set) {
  if (set.weight === 0) {
    return set.reps + (set.reps === 1 ? " rep" : " reps");
  }
  return set.reps + " × " + set.weight + " lb";
}

// Turn a cardio exercise into pieces of text like ["30 min", "3.1 mi"].
// A distance of 0 (left blank) is left out.
function formatCardio(exercise) {
  const parts = [exercise.duration + " min"];
  if (exercise.distance > 0) {
    parts.push(exercise.distance + " mi");
  }
  return parts;
}

// Small helper: create an element with a class and some text.
// Using textContent (not innerHTML) means an exercise name is always
// shown as plain text, even if it contains characters like < or &.
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

// Build the tap-to-expand card for one workout (one date).
function makeWorkoutCard(workout) {
  const card = document.createElement("details");
  card.className = "workout";

  // The always-visible row: date on the left, exercise count on the right.
  const count = workout.exercises.length;
  const summary = document.createElement("summary");
  summary.appendChild(makeElement("span", "workout-date", formatDate(workout.date)));
  summary.appendChild(makeElement("span", "workout-summary", count + (count === 1 ? " exercise" : " exercises")));
  card.appendChild(summary);

  // The part that shows when expanded: each exercise and its sets
  // (or, for cardio, its duration and distance).
  const body = document.createElement("div");
  body.className = "workout-body";
  workout.exercises.forEach(function (exercise) {
    body.appendChild(makeElement("h3", "", exercise.name));

    const list = document.createElement("ol");
    list.className = "set-list";
    // Cardio exercises are stored without a "sets" list.
    const pills = exercise.sets ? exercise.sets.map(formatSet) : formatCardio(exercise);
    pills.forEach(function (text) {
      list.appendChild(makeElement("li", "", text));
    });
    body.appendChild(list);
  });
  card.appendChild(body);

  return card;
}

// Rebuild the History screen. It shows the server's copy once that has
// arrived, and what's saved in localStorage until then (or when offline).
function renderHistory() {
  // While the "Upload my existing history" button is showing, the server
  // has nothing yet, so keep showing this phone's own copy.
  const useServer = serverHistory !== null && uploadButton.hidden;
  const workouts = useServer ? serverWorkouts() : loadWorkouts();

  // Newest first. Dates are "YYYY-MM-DD", so comparing them as text
  // puts them in date order.
  workouts.sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  historyList.innerHTML = "";
  workouts.forEach(function (workout) {
    historyList.appendChild(makeWorkoutCard(workout));
  });

  // Show the friendly message only when there is nothing to list.
  historyEmpty.hidden = workouts.length > 0;
}

// ==================== Server sync ====================

// Besides "workouts", these localStorage keys are used:
const API_KEY_STORAGE = "apiKey";   // the key you typed in, sent with every request
const OUTBOX_KEY = "outbox";        // rows still waiting to reach the server
const MIGRATION_KEY = "migration";  // "offered" or "done" (the one-time upload)

const syncText = document.getElementById("sync-text");
const setKeyButton = document.getElementById("set-key");
const uploadButton = document.getElementById("upload-history");

// The server's answer to /api/history: { strength: [...], cardio: [...] }.
// Stays null until the server has answered once since the page opened.
let serverHistory = null;

let syncing = false;   // true while sync() is running, so it never runs twice at once

// ---------- API helper ----------

// Send one request to the server and return its JSON answer. Throws an
// error if the server can't be reached or says no; error.status then holds
// the HTTP status (401 = wrong key), or is undefined if there was no answer.
async function apiRequest(method, path, body) {
  const options = {
    method: method,
    headers: { "x-api-key": localStorage.getItem(API_KEY_STORAGE) || "" }
  };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);
  if (!response.ok) {
    const error = new Error("Server answered " + response.status);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function apiSaveStrength(entry) {
  return apiRequest("POST", "/api/log/strength", entry);
}

function apiSaveCardio(entry) {
  return apiRequest("POST", "/api/log/cardio", entry);
}

// from and to are "YYYY-MM-DD"; leave them out to get everything.
function apiHistory(from, to) {
  const params = new URLSearchParams();
  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }
  const query = params.toString();
  return apiRequest("GET", "/api/history" + (query ? "?" + query : ""));
}

// These two aren't used yet: the app has no custom-exercise screen right now.
function apiGetExercises() {
  return apiRequest("GET", "/api/exercises");
}

function apiAddExercise(name) {
  return apiRequest("POST", "/api/exercises", { name: name });
}

// ---------- Turning saved entries into server rows, and back ----------

// The server stores cardio names like "running" and "jump_rope".
function serverCardioName(name) {
  return name.toLowerCase().replace(/ /g, "_");
}

// ...and this turns one back into the name used in the dropdown.
function displayCardioName(serverName) {
  const known = EXERCISES[CARDIO_GROUP].find(function (name) {
    return serverCardioName(name) === serverName;
  });
  return known || serverName;
}

// Turn one saved exercise (see DESIGN.md) into the rows the server stores:
// one row per set for strength, a single row for cardio. Each is wrapped
// as { kind, body }, where kind says which API route the body goes to.
function rowsForEntry(date, entry) {
  if (!entry.sets) {
    return [{
      kind: "cardio",
      body: {
        id: entry.id,
        date: date,
        exercise: serverCardioName(entry.name),
        duration_min: entry.duration,
        // A blank distance is saved as 0 here; the server wants "none".
        distance_mi: entry.distance > 0 ? entry.distance : null,
        jumps: null,
        created_at: entry.createdAt
      }
    }];
  }

  return entry.sets.map(function (set) {
    return {
      kind: "strength",
      body: {
        id: set.id,
        date: date,
        exercise: entry.name,
        sets: 1,
        reps: set.reps,
        weight: set.weight,
        created_at: entry.createdAt
      }
    };
  });
}

// Build the list of workouts for the History screen out of the server's
// rows, plus any rows still waiting in the outbox (so something you just
// logged shows up straight away). Same shape as loadWorkouts() returns.
function serverWorkouts() {
  const rows = { strength: serverHistory.strength.slice(), cardio: serverHistory.cardio.slice() };
  const seen = {};   // ids already in the list, so no row is counted twice
  rows.strength.concat(rows.cardio).forEach(function (row) {
    seen[row.id] = true;
  });
  loadOutbox().forEach(function (item) {
    if (!seen[item.body.id]) {
      seen[item.body.id] = true;
      rows[item.kind].push(item.body);
    }
  });

  // First rebuild the exercises. Strength rows that share a date, name and
  // created_at came from one tap of "Save workout", so they are one exercise.
  const entries = [];
  const strengthEntries = {};
  rows.strength.forEach(function (row) {
    const key = row.date + "|" + row.exercise + "|" + row.created_at;
    let entry = strengthEntries[key];
    if (!entry) {
      entry = { date: row.date, createdAt: row.created_at, name: row.exercise, sets: [] };
      strengthEntries[key] = entry;
      entries.push(entry);
    }
    // A row can stand for several identical sets.
    for (let i = 0; i < row.sets; i++) {
      entry.sets.push({ reps: row.reps, weight: row.weight });
    }
  });
  rows.cardio.forEach(function (row) {
    entries.push({
      date: row.date,
      createdAt: row.created_at,
      name: displayCardioName(row.exercise),
      duration: row.duration_min,
      distance: row.distance_mi || 0
    });
  });

  // Then put them in the order they were logged, and group them by date.
  entries.sort(function (a, b) {
    return a.createdAt.localeCompare(b.createdAt);
  });
  const workouts = [];
  const workoutsByDate = {};
  entries.forEach(function (entry) {
    let workout = workoutsByDate[entry.date];
    if (!workout) {
      workout = { date: entry.date, exercises: [] };
      workoutsByDate[entry.date] = workout;
      workouts.push(workout);
    }
    workout.exercises.push(entry);
  });
  return workouts;
}

// ---------- Outbox ----------

// Rows waiting to be sent, oldest first. Empty array if there are none.
function loadOutbox() {
  const saved = localStorage.getItem(OUTBOX_KEY);
  return saved ? JSON.parse(saved) : [];
}

function storeOutbox(items) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

// Add rows to the end of the outbox, skipping any that are already in it.
function queueRows(rows) {
  const outbox = loadOutbox();
  const queued = {};
  outbox.forEach(function (item) {
    queued[item.body.id] = true;
  });
  rows.forEach(function (row) {
    if (!queued[row.body.id]) {
      queued[row.body.id] = true;
      outbox.push(row);
    }
  });
  storeOutbox(outbox);
}

// Take one row out of the outbox once the server has it.
function removeFromOutbox(id) {
  storeOutbox(loadOutbox().filter(function (item) {
    return item.body.id !== id;
  }));
}

// ---------- Syncing ----------

// Add a row the server has just accepted to our copy of its history, so
// it doesn't vanish from the screen when it leaves the outbox. Skipped if
// the server already had it (the one-time upload can resend a row).
function rememberSentRow(item) {
  const rows = serverHistory[item.kind];
  const alreadyThere = rows.some(function (row) {
    return row.id === item.body.id;
  });
  if (!alreadyThere) {
    rows.push(item.body);
  }
}

// Set the small status line. needsKey also shows the "Enter API key" button.
function showSyncStatus(text, needsKey) {
  syncText.textContent = text;
  setKeyButton.hidden = !needsKey;
}

// Talk to the server: fetch the history (once per page open), then send
// everything in the outbox, oldest first. Called when the app opens and
// after every save. If anything fails, the outbox keeps what's left and
// the next call tries again.
async function sync() {
  if (syncing) {
    return;   // the run in progress will pick up anything just added
  }
  if (!localStorage.getItem(API_KEY_STORAGE)) {
    showSyncStatus("Not connected to the server.", true);
    return;
  }

  syncing = true;
  showSyncStatus("Syncing…", false);
  try {
    // History comes first: the check for old history to upload needs to
    // see the server before this phone adds anything to it.
    if (serverHistory === null) {
      serverHistory = await apiHistory();
      updateMigrationOffer();
      renderHistory();
    }

    while (true) {
      const next = loadOutbox()[0];
      if (!next) {
        break;
      }
      try {
        if (next.kind === "cardio") {
          await apiSaveCardio(next.body);
        } else {
          await apiSaveStrength(next.body);
        }
        rememberSentRow(next);
      } catch (error) {
        // 400 means the server will never accept this row, so retrying is
        // pointless. Anything else: stop here and try again next time.
        if (error.status !== 400) {
          throw error;
        }
        console.warn("Server rejected a row; dropping it from the outbox", next);
      }
      removeFromOutbox(next.body.id);
    }

    showSyncStatus("Synced", false);
  } catch (error) {
    if (error.status === 401) {
      showSyncStatus("The server didn't accept the API key.", true);
    } else {
      const waiting = loadOutbox().length;
      showSyncStatus(waiting > 0 ? "Offline — " + waiting + " waiting to sync" : "Offline", false);
    }
  } finally {
    syncing = false;
  }
  renderHistory();
}

// The key is typed in once per phone and kept in localStorage. It is never
// written in this file.
setKeyButton.addEventListener("click", function () {
  const key = window.prompt("API key");
  if (key && key.trim() !== "") {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
    sync();
  }
});

// ---------- One-time upload of old history ----------

// Workouts saved before the server existed have no ids or timestamps.
// Give them some, so they can be uploaded (and never uploaded twice).
// Changes the workouts in place.
function addMissingIds(workouts) {
  workouts.forEach(function (workout) {
    const parts = workout.date.split("-");
    workout.exercises.forEach(function (entry, index) {
      if (!entry.createdAt) {
        // The real time wasn't recorded. Use noon on the day, plus a second
        // per exercise so they stay separate and in order.
        entry.createdAt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, index).toISOString();
      }
      if (entry.sets) {
        entry.sets.forEach(function (set) {
          if (!set.id) {
            set.id = crypto.randomUUID();
          }
        });
      } else if (!entry.id) {
        entry.id = crypto.randomUUID();
      }
    });
  });
}

// True if this phone holds workouts saved before the server existed.
function hasOldHistory() {
  return loadWorkouts().some(function (workout) {
    return workout.exercises.some(function (entry) {
      return !entry.createdAt;
    });
  });
}

// Decide whether to show "Upload my existing history": only if this phone
// has old history and the server has none at all. Once offered, it stays
// offered until it's been used.
function updateMigrationOffer() {
  let state = localStorage.getItem(MIGRATION_KEY);
  const serverIsEmpty = serverHistory.strength.length === 0 && serverHistory.cardio.length === 0;
  if (state === null && serverIsEmpty && hasOldHistory()) {
    state = "offered";
    localStorage.setItem(MIGRATION_KEY, state);
  }
  uploadButton.hidden = state !== "offered";
}

// Put every saved workout in the outbox and let sync() send them. Rows
// are matched by id, so nothing is sent or stored twice.
uploadButton.addEventListener("click", function () {
  const workouts = loadWorkouts();
  addMissingIds(workouts);

  let rows = [];
  workouts.forEach(function (workout) {
    workout.exercises.forEach(function (entry) {
      rows = rows.concat(rowsForEntry(workout.date, entry));
    });
  });

  try {
    storeWorkouts(workouts);   // keep the new ids
    queueRows(rows);
    localStorage.setItem(MIGRATION_KEY, "done");
  } catch (error) {
    showSyncStatus("Couldn't start the upload — browser storage is full or blocked.", false);
    return;
  }

  uploadButton.hidden = true;
  renderHistory();
  sync();
});

// ==================== Start-up ====================

renderExerciseSelect();
resetForm();
renderHistory();
sync();
