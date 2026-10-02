// Workout Tracker — logging saves to localStorage, and the History
// screen reads it back.

// ==================== EXERCISES ====================

// Edit this list to match your program.
// Each line is one muscle group (a heading in the dropdown) followed by
// the exercises listed under it.
const EXERCISES = {
  "Chest": ["Bench Press", "Incline Dumbbell Press", "Cable Flys", "Push-Ups"],
  "Back": ["Pull-Ups", "Barbell Row", "Lat Pulldown", "Cable Row"],
  "Legs": ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"],
  "Shoulders": ["Overhead Press", "Lateral Raise", "Face Pull"],
  "Arms": ["Dumbbell Curl", "Hammer Curl", "Tricep Pushdown", "Overhead Tricep Extension"],
  "Core": ["Plank", "Hanging Leg Raise", "Cable Crunch"]
};

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

// Your own exercise names (added with "Custom...") are stored under this
// key, as a JSON array of names like ["Sled Push", "Dips"].
const CUSTOM_KEY = "customExercises";

// Read all saved workouts. Returns an empty array if nothing is saved yet.
function loadWorkouts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

// Write the full list of workouts back to localStorage.
function storeWorkouts(workouts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

// Read your saved custom exercise names. Empty array if there are none.
function loadCustomExercises() {
  const saved = localStorage.getItem(CUSTOM_KEY);
  return saved ? JSON.parse(saved) : [];
}

// Write the full list of custom exercise names back to localStorage.
function storeCustomExercises(names) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(names));
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

// The dropdown's last option has this value. It can't clash with a real
// exercise name, so we can tell "Custom..." apart from the others.
const CUSTOM_VALUE = "__custom__";

const exerciseSelect = document.getElementById("exercise-select");
const customRow = document.getElementById("custom-exercise");
const customInput = document.getElementById("exercise-name");
const backToListButton = document.getElementById("back-to-list");
const removeCustomButton = document.getElementById("remove-custom");
const setList = document.getElementById("set-list");
const addSetButton = document.getElementById("add-set");
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

// Build the dropdown: a "choose" prompt, your own exercises (if any),
// the EXERCISES list from the top of this file, then "Custom...".
function renderExerciseSelect() {
  exerciseSelect.innerHTML = "";
  addOption(exerciseSelect, "", "Choose an exercise…");

  const customNames = loadCustomExercises();
  if (customNames.length > 0) {
    addGroup("My Exercises", customNames);
  }

  for (const muscleGroup in EXERCISES) {
    addGroup(muscleGroup, EXERCISES[muscleGroup]);
  }

  addOption(exerciseSelect, CUSTOM_VALUE, "Custom...");
}

// Swap between the dropdown and the "type a new name" field.
// show = true shows the text field; show = false goes back to the dropdown.
function showCustomField(show) {
  exerciseSelect.hidden = show;
  customRow.hidden = !show;
  customInput.value = "";
  updateRemoveButton();   // the field is empty now, so this hides the button

  if (show) {
    customInput.focus();   // ready to type straight away
  } else {
    exerciseSelect.value = "";   // back to "Choose an exercise…"
  }
}

// Look for a name we already know (built-in or custom), ignoring
// upper/lower case. Returns the name as it's spelled in the list, or
// undefined if it's brand new.
function findKnownExercise(name) {
  let known = loadCustomExercises();
  for (const muscleGroup in EXERCISES) {
    known = known.concat(EXERCISES[muscleGroup]);
  }
  return known.find(function (knownName) {
    return knownName.toLowerCase() === name.toLowerCase();
  });
}

// Choosing "Custom..." swaps in the text field.
exerciseSelect.addEventListener("change", function () {
  if (exerciseSelect.value === CUSTOM_VALUE) {
    showCustomField(true);
  }
});

// The "List" button next to the text field goes back to the dropdown.
backToListButton.addEventListener("click", function () {
  showCustomField(false);
});

// ---------- Removing a custom exercise ----------

// Look for what's typed in the text field among your saved "My Exercises"
// names, ignoring upper/lower case. Returns the saved name, or undefined.
// It only ever looks at the custom list, so the built-in EXERCISES can
// never be matched (or removed) this way.
function findTypedCustomExercise() {
  const typed = customInput.value.trim().toLowerCase();
  return loadCustomExercises().find(function (customName) {
    return customName.toLowerCase() === typed;
  });
}

// Show the "Remove from My Exercises" button only while the typed text
// matches one of your saved custom names.
function updateRemoveButton() {
  removeCustomButton.hidden = findTypedCustomExercise() === undefined;
}

// Re-check on every keystroke in the text field.
customInput.addEventListener("input", updateRemoveButton);

// Tapping the button deletes that name from localStorage and rebuilds
// the dropdown without it. Workouts already saved in History keep the name.
removeCustomButton.addEventListener("click", function () {
  const nameToRemove = findTypedCustomExercise();
  if (nameToRemove === undefined) {
    return;
  }

  // Keep every custom name except the one being removed.
  const remaining = loadCustomExercises().filter(function (customName) {
    return customName !== nameToRemove;
  });
  storeCustomExercises(remaining);

  renderExerciseSelect();
  updateRemoveButton();   // no longer a match, so the button hides
  showMessage("Removed " + nameToRemove + " from My Exercises", false);
});

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
  showCustomField(false);
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
  // The name comes from the text field if it's showing, otherwise from
  // the dropdown.
  const usingCustom = !customRow.hidden;
  let name;
  let isNewExercise = false;

  if (usingCustom) {
    name = customInput.value.trim();
    if (name === "") {
      showMessage("Enter an exercise name.", true);
      return;
    }
    // If the typed name is already in the list, use the list's spelling
    // instead of adding a duplicate.
    const knownName = findKnownExercise(name);
    if (knownName) {
      name = knownName;
    } else {
      isNewExercise = true;
    }
  } else {
    name = exerciseSelect.value;
    if (name === "") {
      showMessage("Choose an exercise.", true);
      return;
    }
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
    // A brand-new name is remembered so it shows up under "My Exercises".
    if (isNewExercise) {
      const customNames = loadCustomExercises();
      customNames.push(name);
      storeCustomExercises(customNames);
    }
  } catch (error) {
    showMessage("Couldn't save — browser storage is full or blocked.", true);
    return;
  }

  showMessage("Saved " + name + " — " + sets.length + (sets.length === 1 ? " set" : " sets"), false);
  renderExerciseSelect();
  resetForm();
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

renderExerciseSelect();
resetForm();
renderHistory();
