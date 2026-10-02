// Workout Tracker — logging saves to localStorage, and the History
// screen reads it back.

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

// Everything is stored under this one localStorage key, as a JSON array of
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

const exerciseInput = document.getElementById("exercise-name");
const exerciseOptions = document.getElementById("exercise-options");
const setList = document.getElementById("set-list");
const addSetButton = document.getElementById("add-set");
const saveButton = document.getElementById("save-workout");
const saveMessage = document.getElementById("save-message");

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

// Clear the form back to its starting state: no name, a few empty rows.
function resetForm() {
  exerciseInput.value = "";
  setList.innerHTML = "";
  for (let i = 0; i < STARTING_SETS; i++) {
    addSetRow();
  }
}

// Fill the exercise suggestions with every exercise name saved so far.
// It's only a suggestion list, so typing a brand-new name still works.
function renderExerciseOptions() {
  // A Set keeps each name only once, however many times it was logged.
  const names = new Set();
  loadWorkouts().forEach(function (workout) {
    workout.exercises.forEach(function (exercise) {
      names.add(exercise.name);
    });
  });

  exerciseOptions.innerHTML = "";
  Array.from(names).sort().forEach(function (name) {
    const option = document.createElement("option");
    option.value = name;
    exerciseOptions.appendChild(option);
  });
}

// Show a message under the Save button. isError turns it red.
function showMessage(text, isError) {
  saveMessage.textContent = text;
  saveMessage.classList.toggle("error", isError);
}

// Read the set rows into an array like [{ reps: 8, weight: 135 }, ...].
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

    sets.push({ reps: reps, weight: weight });
  }

  return sets;
}

// Save the exercise on the form into today's workout.
function saveWorkout() {
  const name = exerciseInput.value.trim();
  if (name === "") {
    showMessage("Enter an exercise name.", true);
    return;
  }

  const sets = readSets();
  if (sets === null) {
    showMessage("Reps and weight need to be numbers.", true);
    return;
  }
  if (sets.length === 0) {
    showMessage("Fill in at least one set.", true);
    return;
  }

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
  workout.exercises.push({ name: name, sets: sets });

  // localStorage can refuse to save (storage full, or blocked by the
  // browser), so only say "Saved" if it really worked.
  try {
    storeWorkouts(workouts);
  } catch (error) {
    showMessage("Couldn't save — browser storage is full or blocked.", true);
    return;
  }

  showMessage("Saved " + name + " — " + sets.length + (sets.length === 1 ? " set" : " sets"), false);
  resetForm();
  renderExerciseOptions();
  renderHistory();
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

  // The part that shows when expanded: each exercise and its sets.
  const body = document.createElement("div");
  body.className = "workout-body";
  workout.exercises.forEach(function (exercise) {
    body.appendChild(makeElement("h3", "", exercise.name));

    const list = document.createElement("ol");
    list.className = "set-list";
    exercise.sets.forEach(function (set) {
      list.appendChild(makeElement("li", "", formatSet(set)));
    });
    body.appendChild(list);
  });
  card.appendChild(body);

  return card;
}

// Rebuild the History screen from what's saved in localStorage.
function renderHistory() {
  const workouts = loadWorkouts();

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

// ==================== Start-up ====================

resetForm();
renderExerciseOptions();
renderHistory();
