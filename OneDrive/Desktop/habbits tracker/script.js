
// DOM Elements
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const addTaskForm = document.getElementById('add-task-form');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const completedCountLabel = document.getElementById('completed-count');
const streakCountLabel = document.getElementById('streak-count');
const currentDateLabel = document.getElementById('current-date');
const themeToggle = document.getElementById('theme-toggle');
const emptyState = document.getElementById('empty-state');
const confettiContainer = document.getElementById('confetti-container');

// State
let tasks = [];
let streak = 0;
let lastCompletionDate = null; // Format: YYYY-MM-DD

// Helper: Get today's date string YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Helper: Get formatted date for display
function getFormattedDate() {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
}

// Save to LocalStorage
function saveData() {
    localStorage.setItem('habitTasks', JSON.stringify(tasks));
    localStorage.setItem('habitStreak', streak);
    localStorage.setItem('habitLastCompletionDate', lastCompletionDate);
    localStorage.setItem('habitTheme', document.documentElement.getAttribute('data-theme'));
}

// Load from LocalStorage
function loadData() {
    const savedTasks = JSON.parse(localStorage.getItem('habitTasks')) || [];
    const savedStreak = parseInt(localStorage.getItem('habitStreak')) || 0;
    const savedLastCompletionDate = localStorage.getItem('habitLastCompletionDate');
    const savedTheme = localStorage.getItem('habitTheme') || 'light';

    // Set Theme
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Date Logic
    const today = getTodayDateString();

    // If it's a new day, we might need to reset completion status
    // Ideally, habits reset daily. So we check if the tasks were saved on a previous day.
    // However, simplest approach for "Daily Habits" is:
    // If the last time we opened the app (checked via a stored date key) was NOT today,
    // we uncheck all tasks. 
    // BUT, we must be careful not to reset if the user just refreshed the page today.

    // Let's store a separate "lastVisitDate" or just check task timestamps.
    // Simpler: We'll add a 'date' property to tasks or just reset all 'completed' statuses
    // if a "lastVisit" stored in localstorage is not today.

    const lastVisit = localStorage.getItem('habitLastVisit');
    if (lastVisit !== today) {
        // Reset tasks for the new day
        tasks = savedTasks.map(t => ({ ...t, completed: false }));
        // Also check streak logic here
        checkStreakOnLoad(savedStreak, savedLastCompletionDate, today);
    } else {
        tasks = savedTasks;
        streak = savedStreak;
        lastCompletionDate = savedLastCompletionDate;
    }

    localStorage.setItem('habitLastVisit', today);

    // Initial Render
    currentDateLabel.textContent = getFormattedDate();
    streakCountLabel.textContent = streak;
    renderTasks();
    updateProgress();
}

function checkStreakOnLoad(savedStreak, savedLastCompletion, today) {
    if (!savedLastCompletion) {
        streak = 0; // No previous completion
    } else {
        const lastDate = new Date(savedLastCompletion);
        const currentDate = new Date(today);

        // Calculate difference in days
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Completed yesterday, streak intact
            streak = savedStreak;
        } else if (diffDays === 0) {
            // Already completed today? Wait, this function runs if lastVisit != today.
            // If lastVisit != today that means it's a new day. 
            // So diffDays cannot be 0 if the logic holds (unless manually manipulated).
            // Actually, if savedLastCompletion IS today, then we maintained streak.
            streak = savedStreak;
        } else {
            // Missed a day or more
            streak = 0;
        }
    }
    lastCompletionDate = savedLastCompletion; // Keep the date until completed today
}

// Render Tasks
function renderTasks() {
    taskList.innerHTML = '';

    // Toggle Empty State
    if (tasks.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;

        li.innerHTML = `
            <div class="checkbox" onclick="toggleTask(${task.id})">
                ${task.completed ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            </div>
            
            ${task.isEditing
                ? `<input type="text" class="edit-input" value="${escapeHtml(task.text)}" 
                     onblur="saveEdit(${task.id}, this.value)" 
                     onkeydown="handleEditKey(event, ${task.id}, this.value)" autofocus>`
                : `<span class="task-text" onclick="toggleTask(${task.id})" ondblclick="startEdit(${task.id})">${escapeHtml(task.text)}</span>`
            }
            
            <button class="delete-btn" onclick="deleteTask(${task.id})" aria-label="Delete Task">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        taskList.appendChild(li);

        // Focus input if editing
        if (task.isEditing) {
            const input = li.querySelector('.edit-input');
            if (input) {
                // Determine logic to set cursor at end is nice but autofocus works for now
                setTimeout(() => input.focus(), 0);
            }
        }
    });
}


// Add Task
addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (text) {
        const newTask = {
            id: Date.now(),
            text: text,
            text: text,
            completed: false,
            isEditing: false
        };
        tasks.push(newTask);
        taskInput.value = '';
        saveData();
        renderTasks();
        updateProgress();
    }
});

// Toggle Task
window.toggleTask = function (id) {
    tasks = tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveData();
    renderTasks();
    updateProgress();
};

// Edit Task Logic
window.startEdit = function (id) {
    tasks = tasks.map(t => t.id === id ? { ...t, isEditing: true } : t);
    renderTasks();
};

window.saveEdit = function (id, newText) {
    const text = newText.trim();
    if (text) {
        tasks = tasks.map(t => t.id === id ? { ...t, text: text, isEditing: false } : t);
    } else {
        // If empty, just cancel edit (or delete? let's cancel)
        tasks = tasks.map(t => t.id === id ? { ...t, isEditing: false } : t);
    }
    saveData();
    renderTasks();
};

window.handleEditKey = function (e, id, val) {
    if (e.key === 'Enter') {
        saveEdit(id, val);
    }
}

// Delete Task
window.deleteTask = function (id) {
    if (confirm('Are you sure you want to delete this habit?')) {
        tasks = tasks.filter(task => task.id !== id);
        saveData();
        renderTasks();
        updateProgress();
    }
};

// Update Progress & Streak Logic
function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% Done`;
    completedCountLabel.textContent = `${completed}/${total}`;

    // Check if daily goal achieved for Streak
    checkDailyCompletion(total, completed);
}

function checkDailyCompletion(total, completed) {
    const today = getTodayDateString();

    if (total > 0 && total === completed) {
        // All done!
        if (lastCompletionDate !== today) {
            streak++;
            lastCompletionDate = today;
            streakCountLabel.textContent = streak;

            // Celebration/Confetti could go here
            if (streak > 0) {
                // Simple bounce animation on streak container
                const streakContainer = document.querySelector('.streak-container');
                streakContainer.animate([
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.2)' },
                    { transform: 'scale(1)' }
                ], { duration: 300 });

                triggerConfetti();
            }
        }
    } else {
        // If we uncheck a task today and lose "All done" status
        // We should revert streak IF it was incremented today.
        if (lastCompletionDate === today) {
            // Find what streak WAS before today. 
            // Since we don't store history properly in this simple model, 
            // we'll assume we just decrement by 1 if > 0.
            if (streak > 0) streak--;
            lastCompletionDate = null; // Reset today's completion
            streakCountLabel.textContent = streak;
        }
    }
    saveData();
}

// Theme Toggle
themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    saveData();
});

// Helper for XSS prevention
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Confetti Logic
function triggerConfetti() {
    const colors = ['#6366f1', '#ef4444', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.opacity = Math.random();

        confettiContainer.appendChild(confetti);

        // Remove after animation
        setTimeout(() => {
            confetti.remove();
        }, 4000);
    }
}

// Initialize
loadData();
