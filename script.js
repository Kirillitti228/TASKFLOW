// TASKFLOW — Task management

// Find the HTML elements we need.
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskPriority = document.getElementById("task-priority");
const taskList = document.getElementById("task-list");
const searchInput = document.getElementById("search-input");
const clearCompletedButton = document.getElementById("clear-completed");

// Statistics elements.
const totalCount = document.getElementById("total-count");
const activeCount = document.getElementById("active-count");
const completedCount = document.getElementById("completed-count");
const progressPercent = document.getElementById("progress-percent");
const progressFill = document.getElementById("progress-fill");
const headingCount = document.getElementById("heading-count");
const navAllCount = document.getElementById("nav-all-count");
const navActiveCount = document.getElementById("nav-active-count");
const navCompletedCount = document.getElementById("nav-completed-count");
const footerCount = document.getElementById("footer-count");

const STORAGE_KEY = "taskflow-tasks-v1";

let tasks = loadTasks();
let currentFilter = "all";
let searchQuery = "";

// Load saved tasks from the browser.
function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);
        if (!savedTasks) return [];

        const parsedTasks = JSON.parse(savedTasks);
        if (!Array.isArray(parsedTasks)) return [];

        return parsedTasks.filter((task) =>
            task &&
            (typeof task.id === "string" || typeof task.id === "number") &&
            typeof task.title === "string" &&
            typeof task.completed === "boolean" &&
            ["low", "medium", "high"].includes(task.priority)
        );
    } catch (error) {
        console.error("Could not load tasks:", error);
        return [];
    }
}

// Save tasks as JSON in LocalStorage.
function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error("Could not save tasks:", error);
        alert("Your browser could not save the tasks. Check browser storage settings.");
    }
}

function createTaskId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Add a task.
function addTask(title, priority) {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
        taskInput.focus();
        return;
    }

    tasks.unshift({
        id: createTaskId(),
        title: cleanTitle,
        completed: false,
        priority,
        createdAt: new Date().toISOString()
    });

    saveTasks();
    renderTasks();

    taskInput.value = "";
    taskPriority.value = "medium";
    taskInput.focus();
}

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTask(taskInput.value, taskPriority.value);
});

// Mark a task as complete or active again.
function toggleTask(id) {
    tasks = tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
    );

    saveTasks();
    renderTasks();
}

// Delete one task.
function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    renderTasks();
}

// Apply selected filter and search query.
function getVisibleTasks() {
    return tasks.filter((task) => {
        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "active" && !task.completed) ||
            (currentFilter === "completed" && task.completed);

        const matchesSearch = task.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch;
    });
}

function setFilter(filter) {
    if (!["all", "active", "completed"].includes(filter)) return;
    currentFilter = filter;
    renderTasks();
}

document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
});

searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim();
    renderTasks();
});

// Build the visible task list.
function renderTasks() {
    taskList.replaceChildren();
    const visibleTasks = getVisibleTasks();

    if (visibleTasks.length === 0) {
        renderEmptyState();
    } else {
        visibleTasks.forEach((task) => {
            taskList.appendChild(createTaskElement(task));
        });
    }

    updateStats();
    updateFilterButtons();
}

function createTaskElement(task) {
    const article = document.createElement("article");
    article.className = "task-item";
    if (task.completed) article.classList.add("is-completed");

    const checkbox = document.createElement("button");
    checkbox.type = "button";
    checkbox.className = "task-checkbox";
    checkbox.setAttribute("aria-pressed", String(task.completed));
    checkbox.setAttribute(
        "aria-label",
        task.completed
            ? `Mark ${task.title} as active`
            : `Mark ${task.title} as completed`
    );
    checkbox.addEventListener("click", () => toggleTask(task.id));

    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const priority = document.createElement("span");
    priority.className = `priority-badge priority-${task.priority}`;
    priority.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

    const date = document.createElement("span");
    date.className = "task-date";
    date.textContent = formatTaskDate(task.createdAt);

    meta.append(priority, date);
    main.append(title, meta);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
    deleteButton.title = "Delete task";
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    article.append(checkbox, main, deleteButton);
    return article;
}

function formatTaskDate(dateString) {
    if (!dateString) return "Task";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Task";

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Show a useful message when no tasks match.
function renderEmptyState() {
    const container = document.createElement("div");
    container.className = "empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-icon";

    const heading = document.createElement("h3");
    const description = document.createElement("p");

    if (searchQuery) {
        icon.textContent = "⌕";
        heading.textContent = "No matching tasks";
        description.textContent = "Try another search term to find your task.";
    } else if (currentFilter === "active" && tasks.length > 0) {
        icon.textContent = "✓";
        heading.textContent = "All caught up!";
        description.textContent = "You have no active tasks. Enjoy your progress.";
    } else if (currentFilter === "completed" && tasks.length > 0) {
        icon.textContent = "◷";
        heading.textContent = "Nothing completed yet";
        description.textContent = "Finish a task and it will appear here.";
    } else {
        icon.textContent = "✦";
        heading.textContent = "Your list starts here";
        description.textContent = "Add your first task above and start organizing your day.";
    }

    container.append(icon, heading, description);
    taskList.appendChild(container);
}

// Update counters and progress bar.
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const active = total - completed;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    totalCount.textContent = total;
    activeCount.textContent = active;
    completedCount.textContent = completed;
    progressPercent.textContent = progress;
    progressFill.style.width = `${progress}%`;
    headingCount.textContent = getVisibleTasks().length;

    navAllCount.textContent = total;
    navActiveCount.textContent = active;
    navCompletedCount.textContent = completed;

    footerCount.textContent = active === 1 ? "1 task remaining" : `${active} tasks remaining`;
    clearCompletedButton.disabled = completed === 0;
}

// Keep the sidebar and filter tabs synchronized.
function updateFilterButtons() {
    document.querySelectorAll("[data-filter]").forEach((button) => {
        const isActive = button.dataset.filter === currentFilter;
        button.classList.toggle("active", isActive);

        if (button.classList.contains("nav-item")) {
            if (isActive) {
                button.setAttribute("aria-current", "page");
            } else {
                button.removeAttribute("aria-current");
            }
        }
    });
}

// Remove all completed tasks at once.
clearCompletedButton.addEventListener("click", () => {
    if (!tasks.some((task) => task.completed)) return;

    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    renderTasks();
});

// Initialize the application.
renderTasks();
