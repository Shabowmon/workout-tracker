// Workout Tracker — step 2: logging works and saves to localStorage.
// The History screen still shows placeholder entries (that's step 3).

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
    '<input class="number-input weight-input" type="text" inputmode="decimal" placeholder="0" aria-label="Set ' + number + ' weight">';

  setList.appendChild(row);
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
}

addSetButton.addEventListener("click", addSetRow);
saveButton.addEventListener("click", saveWorkout);

// ==================== Start-up ====================

resetForm();
renderExerciseOptions();
