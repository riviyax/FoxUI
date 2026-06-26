/**
 * todo.js — To-Do List feature
 * Uses localStorage for task persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
  const todoInput  = document.getElementById('todo-input');
  const addTodoBtn = document.getElementById('add-todo-btn');
  const todoList   = document.getElementById('todo-list');
  const errmsg     = document.getElementById('errmsg');

  const STORAGE_KEY = 'newtab_todo_tasks';

  /* ── Storage helpers ── */
  const loadTasks = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  };
  const saveTasks = tasks => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

  /* ── Render ── */
  const renderTasks = () => {
    const tasks = loadTasks();
    todoList.innerHTML = '';

    tasks.forEach((task, index) => {
      const li = document.createElement('li');
      li.setAttribute('data-index', index);
      li.className = `todo-item${task.completed ? ' completed' : ''}`;

      const textSpan = document.createElement('span');
      textSpan.className   = 'todo-item-text';
      textSpan.textContent = task.text;
      textSpan.addEventListener('click', () => toggleTask(index));

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-todo-btn';
      delBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
      delBtn.title     = 'Delete task';
      delBtn.addEventListener('click', () => deleteTask(index));

      li.append(textSpan, delBtn);
      todoList.appendChild(li);
    });
  };

  /* ── Actions ── */
  const addTask = () => {
    const text = todoInput.value.trim();
    if (!text) return;
    const tasks = loadTasks();
    tasks.push({ text, completed: false });
    saveTasks(tasks);
    renderTasks();
    todoInput.value = '';
  };

  const toggleTask = index => {
    const tasks = loadTasks();
    if (tasks[index]) { tasks[index].completed = !tasks[index].completed; saveTasks(tasks); renderTasks(); }
  };

  const deleteTask = index => {
    const tasks = loadTasks();
    tasks.splice(index, 1);
    saveTasks(tasks);
    renderTasks();
  };

  /* ── Event Listeners ── */
  addTodoBtn.addEventListener('click', addTask);
  todoInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });

  /* ── Lock notice (FIXED: reads correct key) ── */
  // 'draggableCards' = 'true' means dragging is enabled = panels are unlocked
  // The to-do card can always be used regardless of lock state; remove confusing message.
  if (errmsg) errmsg.textContent = '';

  /* ── Initial render ── */
  renderTasks();
});