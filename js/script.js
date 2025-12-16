// ===== Hierarchical Task Manager Application =====

class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.editingSubtaskParentId = null; // Track which task we're adding subtask to

        // DOM Elements
        this.taskForm = document.getElementById('taskForm');
        this.taskInput = document.getElementById('taskInput');
        this.taskDate = document.getElementById('taskDate');
        this.taskSubject = document.getElementById('taskSubject');
        this.taskTag = document.getElementById('taskTag');
        this.prioritySelect = document.getElementById('prioritySelect');
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.themeToggle = document.getElementById('themeToggle');
        this.searchInput = document.getElementById('searchInput');
        this.filterBtns = document.querySelectorAll('.filter-btn');

        // Stats Elements
        this.totalTasksEl = document.getElementById('totalTasks');
        this.completedTasksEl = document.getElementById('completedTasks');
        this.pendingTasksEl = document.getElementById('pendingTasks');

        // Modal Elements
        this.modalOverlay = document.getElementById('inputModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalInput = document.getElementById('modalInput');
        this.modalConfirm = document.getElementById('modalConfirm');
        this.modalCancel = document.getElementById('modalCancel');
        this.modalClose = document.getElementById('modalClose');

        this.init();
    }

    init() {
        this.loadTheme();
        this.bindEvents();
        this.setDefaultDate();
        this.renderTasks();
        this.updateStats();
    }

    setDefaultDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        this.taskDate.value = `${day}/${month}/${year}`;
    }

    // ===== Event Bindings =====
    bindEvents() {
        // Form submit
        this.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderTasks();
            });
        });

        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTasks();
        });

        // Task list delegation
        this.taskList.addEventListener('click', (e) => this.handleTaskAction(e));
        this.taskList.addEventListener('change', (e) => this.handleTaskToggle(e));
    }

    // ===== Theme Management =====
    loadTheme() {
        const savedTheme = localStorage.getItem('taskflow-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('taskflow-theme', newTheme);
    }

    // ===== Task CRUD Operations =====
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    addTask(parentId = null) {
        const text = this.taskInput.value.trim();
        if (!text) return;

        const task = {
            id: this.generateId(),
            parentId: parentId,
            text: text,
            date: this.parseInputDate(this.taskDate.value),
            subject: this.taskSubject.value.trim(),
            tag: this.taskTag.value.trim(),
            priority: this.prioritySelect.value,
            completed: false,
            expanded: true,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();

        // Reset form
        this.taskInput.value = '';
        this.taskSubject.value = '';
        this.taskTag.value = '';
        this.setDefaultDate();
        this.editingSubtaskParentId = null;
        this.taskInput.focus();
    }

    addSubtask(parentId) {
        const parent = this.findTask(parentId);
        if (!parent) return;

        this.showModal('Thêm subtask', 'Nhập tên subtask...').then(text => {
            if (!text || !text.trim()) return;

            const subtask = {
                id: this.generateId(),
                parentId: parentId,
                text: text.trim(),
                date: parent.date,
                subject: parent.subject,
                tag: '',
                priority: parent.priority,
                completed: false,
                expanded: true,
                createdAt: new Date().toISOString()
            };

            this.tasks.push(subtask);

            // Ensure parent is expanded
            parent.expanded = true;

            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        });
    }


    findTask(id) {
        return this.tasks.find(t => t.id === id);
    }

    getChildren(parentId) {
        return this.tasks.filter(t => t.parentId === parentId);
    }

    getRootTasks() {
        return this.tasks.filter(t => t.parentId === null);
    }

    getAllDescendants(taskId) {
        const descendants = [];
        const children = this.getChildren(taskId);

        for (const child of children) {
            descendants.push(child);
            descendants.push(...this.getAllDescendants(child.id));
        }

        return descendants;
    }

    deleteTask(id) {
        const taskEl = document.querySelector(`[data-id="${id}"]`);
        if (taskEl) {
            taskEl.classList.add('removing');
            setTimeout(() => {
                // Delete task and all descendants
                const descendants = this.getAllDescendants(id);
                const idsToDelete = [id, ...descendants.map(d => d.id)];
                this.tasks = this.tasks.filter(task => !idsToDelete.includes(task.id));
                this.saveTasks();
                this.renderTasks();
                this.updateStats();
            }, 400);
        }
    }

    toggleTask(id) {
        const task = this.findTask(id);
        if (task) {
            task.completed = !task.completed;

            // Also toggle all children
            const descendants = this.getAllDescendants(id);
            descendants.forEach(d => d.completed = task.completed);

            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    toggleExpand(id) {
        const task = this.findTask(id);
        if (task) {
            task.expanded = !task.expanded;
            this.saveTasks();
            this.renderTasks();
        }
    }

    editTask(id) {
        const task = this.findTask(id);
        if (!task) return;

        this.showModal('Sửa công việc', 'Nhập nội dung mới...', task.text).then(newText => {
            if (newText !== null && newText.trim()) {
                task.text = newText.trim();
                this.saveTasks();
                this.renderTasks();
            }
        });
    }

    // ===== Modal Helper =====
    showModal(title, placeholder, defaultValue = '') {
        return new Promise((resolve) => {
            this.modalTitle.textContent = title;
            this.modalInput.placeholder = placeholder;
            this.modalInput.value = defaultValue;
            this.modalOverlay.classList.add('active');

            // Focus input after animation
            setTimeout(() => this.modalInput.focus(), 100);

            const cleanup = () => {
                this.modalOverlay.classList.remove('active');
                this.modalConfirm.removeEventListener('click', onConfirm);
                this.modalCancel.removeEventListener('click', onCancel);
                this.modalClose.removeEventListener('click', onCancel);
                this.modalInput.removeEventListener('keydown', onKeydown);
                this.modalOverlay.removeEventListener('click', onOverlayClick);
            };

            const onConfirm = () => {
                const value = this.modalInput.value;
                cleanup();
                resolve(value);
            };

            const onCancel = () => {
                cleanup();
                resolve(null);
            };

            const onKeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onConfirm();
                } else if (e.key === 'Escape') {
                    onCancel();
                }
            };

            const onOverlayClick = (e) => {
                if (e.target === this.modalOverlay) {
                    onCancel();
                }
            };

            this.modalConfirm.addEventListener('click', onConfirm);
            this.modalCancel.addEventListener('click', onCancel);
            this.modalClose.addEventListener('click', onCancel);
            this.modalInput.addEventListener('keydown', onKeydown);
            this.modalOverlay.addEventListener('click', onOverlayClick);
        });
    }

    // ===== Event Handlers =====
    handleTaskAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const taskItem = btn.closest('.task-item');
        const id = taskItem.dataset.id;
        const action = btn.dataset.action;

        switch (action) {
            case 'delete':
                this.deleteTask(id);
                break;
            case 'edit':
                this.editTask(id);
                break;
            case 'add-subtask':
                this.addSubtask(id);
                break;
            case 'toggle-expand':
                this.toggleExpand(id);
                break;
        }
    }

    handleTaskToggle(e) {
        if (e.target.type === 'checkbox') {
            const taskItem = e.target.closest('.task-item');
            const id = taskItem.dataset.id;
            this.toggleTask(id);
        }
    }

    // ===== Filtering & Searching =====
    getFilteredTasks() {
        return this.tasks.filter(task => {
            // Filter by status
            if (this.currentFilter === 'completed' && !task.completed) return false;
            if (this.currentFilter === 'pending' && task.completed) return false;

            // Filter by search query
            if (this.searchQuery) {
                const searchFields = [task.text, task.subject, task.tag].join(' ').toLowerCase();
                if (!searchFields.includes(this.searchQuery)) {
                    return false;
                }
            }

            return true;
        });
    }

    // ===== Rendering =====
    renderTasks() {
        // Get all tasks for tree rendering (no filter issues with hierarchy)
        const rootTasks = this.getRootTasks();

        // Apply filter to check if any should show
        if (rootTasks.length === 0 && this.tasks.length === 0) {
            this.taskList.innerHTML = '';
            this.emptyState.classList.add('visible');
            return;
        }

        this.emptyState.classList.remove('visible');

        // Render hierarchical tree - filter is applied within renderTaskTree
        const html = rootTasks.map(task => this.renderTaskTree(task, 0)).join('');

        if (html.trim() === '') {
            this.taskList.innerHTML = '';
            this.emptyState.classList.add('visible');
        } else {
            this.taskList.innerHTML = html;
        }
    }

    shouldShowTask(task) {
        // Filter by status
        if (this.currentFilter === 'completed' && !task.completed) return false;
        if (this.currentFilter === 'pending' && task.completed) return false;

        // Filter by search query
        if (this.searchQuery) {
            const searchFields = [task.text, task.subject, task.tag].join(' ').toLowerCase();
            if (!searchFields.includes(this.searchQuery)) {
                // Check if any children match
                const children = this.getChildren(task.id);
                const childMatch = children.some(child => this.shouldShowTask(child));
                if (!childMatch) return false;
            }
        }

        return true;
    }

    renderTaskTree(task, level) {
        // Check if this task or its children should be shown
        if (!this.shouldShowTask(task)) {
            return '';
        }

        const children = this.getChildren(task.id);
        const visibleChildren = children.filter(c => this.shouldShowTask(c));
        const hasVisibleChildren = visibleChildren.length > 0;
        const hasChildren = children.length > 0;
        const completionPercent = hasChildren ? this.getCompletionPercentage(task.id) : null;

        // Build the children HTML first (nested ul inside this li)
        let childrenHtml = '';
        if (hasVisibleChildren && task.expanded) {
            childrenHtml = `<ul class="task-children" data-parent="${task.id}">`;
            childrenHtml += visibleChildren.map(child => this.renderTaskTree(child, level + 1)).join('');
            childrenHtml += `</ul>`;
        }

        return this.createTaskHTML(task, level, hasVisibleChildren, childrenHtml, completionPercent);
    }

    createTaskHTML(task, level = 0, hasChildren = false, childrenHtml = '', completionPercent = null) {
        const priorityLabels = {
            high: 'Cao',
            medium: 'TB',
            low: 'Thấp'
        };

        const formattedDate = this.formatDisplayDate(task.date);
        const indent = level * 24;

        const expandIcon = hasChildren
            ? `<button class="btn-expand" data-action="toggle-expand" title="${task.expanded ? 'Thu gọn' : 'Mở rộng'}">${task.expanded ? '▼' : '▶'}</button>`
            : `<span class="expand-placeholder"></span>`;

        const subjectBadge = task.subject
            ? `<span class="subject-badge">${this.escapeHTML(task.subject)}</span>`
            : '';

        const tagBadge = task.tag
            ? `<span class="tag-badge">${this.escapeHTML(task.tag)}</span>`
            : '';

        const progressBadge = completionPercent !== null
            ? `<span class="progress-badge ${completionPercent === 100 ? 'complete' : ''}">${completionPercent}%</span>`
            : '';

        return `
            <li class="task-item-wrapper level-${level}">
                <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}" style="--indent: ${indent}px;">
                    ${expandIcon}
                    <label class="task-checkbox">
                        <input type="checkbox" ${task.completed ? 'checked' : ''}>
                        <span class="checkbox-custom"></span>
                    </label>
                    <div class="task-content">
                        <div class="task-header">
                            <span class="task-text">${this.escapeHTML(task.text)}</span>
                            ${progressBadge}
                            <span class="priority-badge ${task.priority}">${priorityLabels[task.priority]}</span>
                        </div>
                        <div class="task-meta">
                            <span class="task-date">📅 ${formattedDate}</span>
                            ${subjectBadge}
                            ${tagBadge}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn-action add-subtask" data-action="add-subtask" title="Thêm subtask">➕</button>
                        <button class="btn-action edit" data-action="edit" title="Sửa">✏️</button>
                        <button class="btn-action delete" data-action="delete" title="Xóa">🗑️</button>
                    </div>
                </div>
                ${childrenHtml}
            </li>
        `;
    }

    // ===== Statistics =====
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;

        this.animateNumber(this.totalTasksEl, total);
        this.animateNumber(this.completedTasksEl, completed);
        this.animateNumber(this.pendingTasksEl, pending);
    }

    animateNumber(element, target) {
        const current = parseInt(element.textContent) || 0;
        if (current === target) return;

        const duration = 300;
        const steps = 20;
        const increment = (target - current) / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            element.textContent = Math.round(current + increment * step);
            if (step >= steps) {
                clearInterval(timer);
                element.textContent = target;
            }
        }, duration / steps);
    }

    // ===== Storage =====
    saveTasks() {
        localStorage.setItem('taskflow-tasks-v2', JSON.stringify(this.tasks));
    }

    loadTasks() {
        // Try new format first
        let stored = localStorage.getItem('taskflow-tasks-v2');
        if (stored) {
            return JSON.parse(stored);
        }

        // Migrate from old format
        stored = localStorage.getItem('taskflow-tasks');
        if (stored) {
            const oldTasks = JSON.parse(stored);
            const newTasks = oldTasks.map(task => ({
                ...task,
                id: task.id.toString(),
                parentId: null,
                date: task.createdAt ? task.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                subject: '',
                tag: '',
                expanded: true
            }));
            // Save in new format and clear old
            localStorage.setItem('taskflow-tasks-v2', JSON.stringify(newTasks));
            return newTasks;
        }

        return [];
    }

    // ===== Utilities =====
    getCompletionPercentage(taskId) {
        const descendants = this.getAllDescendants(taskId);
        if (descendants.length === 0) return null;

        const completedCount = descendants.filter(t => t.completed).length;
        return Math.round((completedCount / descendants.length) * 100);
    }

    formatDisplayDate(dateString) {
        if (!dateString) return '';
        // Handle both ISO format (yyyy-MM-dd) and dd/MM/yyyy format
        if (dateString.includes('/')) {
            return dateString; // Already in display format
        }
        const date = new Date(dateString + 'T00:00:00');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    parseInputDate(dateString) {
        if (!dateString) {
            return new Date().toISOString().split('T')[0];
        }
        // If already in ISO format, return as-is
        if (dateString.includes('-')) {
            return dateString;
        }
        // Parse dd/MM/yyyy format
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
        return new Date().toISOString().split('T')[0];
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
});
