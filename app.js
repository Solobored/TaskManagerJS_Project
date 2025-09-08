/* 
  TaskManagerJS — CSE 310 Module #1 (Language – JavaScript)
  Author: Your Name
  Purpose: A simple, accessible task manager demonstrating DOM, events, state, and localStorage.
*/

/** --------------------------- Utilities ---------------------------------- */

/**
 * Generate a unique ID for tasks.
 * @returns {string} A random ID string.
 */
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Parse a date string (yyyy-mm-dd) into a Date object (start of the day).
 * @param {string} str
 * @returns {Date|null}
 */
function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a Date as YYYY-MM-DD for inputs and display.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** --------------------------- State Layer -------------------------------- */

/**
 * Read tasks from localStorage.
 * @returns {Array<Task>}
 */
function loadTasks() {
  const raw = localStorage.getItem("tasks.v1");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persist tasks to localStorage.
 * @param {Array<Task>} tasks 
 */
function saveTasks(tasks) {
  localStorage.setItem("tasks.v1", JSON.stringify(tasks));
}

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} notes
 * @property {string|null} dueISO  // YYYY-MM-DD or null
 * @property {boolean} completed
 * @property {string} createdISO
 */

/**
 * Create a new Task object.
 * @param {string} title 
 * @param {string} notes 
 * @param {string|null} dueISO 
 * @returns {Task}
 */
function makeTask(title, notes, dueISO) {
  return {
    id: uid(),
    title,
    notes,
    dueISO: dueISO || null,
    completed: false,
    createdISO: new Date().toISOString()
  };
}

/** --------------------------- DOM Refs ----------------------------------- */
const els = {
  form: document.querySelector("#taskForm"),
  title: document.querySelector("#title"),
  notes: document.querySelector("#notes"),
  due: document.querySelector("#due"),
  list: document.querySelector("#taskList"),
  filter: document.querySelector("#filter"),
  search: document.querySelector("#search"),
  countTotal: document.querySelector("#countTotal"),
  countActive: document.querySelector("#countActive"),
  countCompleted: document.querySelector("#countCompleted"),
  template: document.querySelector("#taskItemTemplate")
};

/** --------------------------- App State ---------------------------------- */
let state = {
  tasks: loadTasks(),
  filter: "all",
  search: ""
};

/** --------------------------- Render ------------------------------------- */

/**
 * Compute filtered + searched tasks.
 * @returns {Task[]}
 */
function visibleTasks() {
  const todayStr = formatDate(new Date());
  return state.tasks.filter(t => {
    // filter
    switch (state.filter) {
      case "active":
        if (t.completed) return false;
        break;
      case "completed":
        if (!t.completed) return false;
        break;
      case "overdue":
        if (!t.dueISO) return false;
        if (t.completed) return false;
        if (t.dueISO >= todayStr) return false;
        break;
      case "today":
        if (t.dueISO !== todayStr) return false;
        break;
      default: /* all */ break;
    }
    // search
    const q = state.search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      (t.notes || "").toLowerCase().includes(q)
    );
  });
}

/**
 * Update stats
 */
function renderStats() {
  els.countTotal.textContent = String(state.tasks.length);
  els.countActive.textContent = String(state.tasks.filter(t => !t.completed).length);
  els.countCompleted.textContent = String(state.tasks.filter(t => t.completed).length);
}

/**
 * Render the list UI from state.
 */
function renderList() {
  els.list.innerHTML = "";
  const tasks = visibleTasks();

  tasks.forEach(task => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector(".toggle-complete");
    const titleEl = node.querySelector(".title");
    const notesEl = node.querySelector(".notes");
    const dueBadge = node.querySelector(".badge.due");
    const statusBadge = node.querySelector(".badge.status");
    const btnEdit = node.querySelector(".edit");
    const btnSave = node.querySelector(".save");
    const btnCancel = node.querySelector(".cancel");
    const btnDelete = node.querySelector(".delete");

    // Populate content
    checkbox.checked = task.completed;
    titleEl.textContent = task.title;
    notesEl.textContent = task.notes || "";
    dueBadge.textContent = task.dueISO ? `Due ${task.dueISO}` : "";
    statusBadge.textContent = task.completed ? "Completed" : "Active";

    // Accessibility status
    node.setAttribute("data-id", task.id);
    if (task.completed) node.classList.add("is-completed");

    // Event: toggle complete
    checkbox.addEventListener("change", () => {
      toggleComplete(task.id, checkbox.checked);
    });

    // Event: delete
    btnDelete.addEventListener("click", () => {
      deleteTask(task.id);
    });

    // Event: edit
    btnEdit.addEventListener("click", () => {
      enterEditMode(node, task);
    });

    // Event: save
    btnSave.addEventListener("click", () => {
      const updated = collectEditValues(node);
      if (updated) updateTask(task.id, updated);
      exitEditMode(node);
    });

    // Event: cancel
    btnCancel.addEventListener("click", () => {
      exitEditMode(node);
      renderList(); // re-render to reset values
    });

    els.list.appendChild(node);
  });

  renderStats();
}

/** --------------------------- Mutations ---------------------------------- */

/**
 * Add a task to state and persist.
 * @param {Task} task 
 */
function addTask(task) {
  state.tasks.unshift(task);
  saveTasks(state.tasks);
  renderList();
}

/**
 * Toggle a task's completion state.
 * @param {string} id 
 * @param {boolean} done 
 */
function toggleComplete(id, done) {
  state.tasks = state.tasks.map(t => t.id === id ? { ...t, completed: done } : t);
  saveTasks(state.tasks);
  renderList();
}

/**
 * Delete a task by id.
 * @param {string} id 
 */
function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks(state.tasks);
  renderList();
}

/**
 * Update a task by id with partial fields.
 * @param {string} id 
 * @param {{title?:string, notes?:string, dueISO?:string|null}} patch 
 */
function updateTask(id, patch) {
  state.tasks = state.tasks.map(t => t.id === id ? { ...t, ...patch } : t);
  saveTasks(state.tasks);
  renderList();
}

/** --------------------------- Edit Mode ---------------------------------- */

/**
 * Switch a list item into inline edit mode.
 * @param {HTMLElement} node 
 * @param {Task} task 
 */
function enterEditMode(node, task) {
  const titleEl = node.querySelector(".title");
  const notesEl = node.querySelector(".notes");
  const btnEdit = node.querySelector(".edit");
  const btnSave = node.querySelector(".save");
  const btnCancel = node.querySelector(".cancel");

  // Create inputs
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = task.title;
  titleInput.className = "edit-title";

  const notesInput = document.createElement("input");
  notesInput.type = "text";
  notesInput.value = task.notes || "";
  notesInput.className = "edit-notes";

  const dueInput = document.createElement("input");
  dueInput.type = "date";
  dueInput.value = task.dueISO || "";
  dueInput.className = "edit-due";

  // Replace display with inputs
  titleEl.replaceWith(titleInput);
  notesEl.replaceWith(notesInput);

  // Add due input next to notes
  const bodyDiv = node.querySelector(".body");
  const dueRow = document.createElement("div");
  dueRow.className = "edit-due-row";
  const dueLabel = document.createElement("label");
  dueLabel.textContent = "Due";
  dueLabel.style.fontSize = "12px";
  dueLabel.style.color = "#a6b0d6";
  dueRow.appendChild(dueLabel);
  dueRow.appendChild(dueInput);
  bodyDiv.appendChild(dueRow);

  // Toggle buttons
  btnEdit.hidden = true;
  btnSave.hidden = false;
  btnCancel.hidden = false;
}

/**
 * Collect values from edit mode inputs.
 * @param {HTMLElement} node 
 * @returns {{title:string, notes:string, dueISO:string|null}|null}
 */
function collectEditValues(node) {
  const titleInput = node.querySelector(".edit-title");
  const notesInput = node.querySelector(".edit-notes");
  const dueInput = node.querySelector(".edit-due");
  const title = titleInput?.value.trim();
  if (!title) {
    alert("Title cannot be empty.");
    return null;
  }
  const notes = (notesInput?.value || "").trim();
  const dueISO = dueInput?.value || null;
  return { title, notes, dueISO };
}

/**
 * Exit edit mode by re-rendering UI.
 * @param {HTMLElement} node 
 */
function exitEditMode(node) {
  const btnEdit = node.querySelector(".edit");
  const btnSave = node.querySelector(".save");
  const btnCancel = node.querySelector(".cancel");
  btnEdit.hidden = false;
  btnSave.hidden = true;
  btnCancel.hidden = true;
}

/** --------------------------- Event Wiring ------------------------------- */

// Form submit: add task
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = els.title.value.trim();
  const notes = els.notes.value.trim();
  const dueISO = els.due.value || null;
  if (!title) {
    els.title.focus();
    return;
  }
  addTask(makeTask(title, notes, dueISO));
  els.form.reset();
  els.title.focus();
});

// Filter changes
els.filter.addEventListener("change", () => {
  state.filter = els.filter.value;
  renderList();
});

// Search input
els.search.addEventListener("input", () => {
  state.search = els.search.value;
  renderList();
});

// Initial render
renderList();
