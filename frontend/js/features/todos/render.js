/**
 * features/todos/render.js — task-card DOM builders + list painter.
 *
 * Pure(ish) rendering: given the store's todos and view state (`filter`,
 * `search`), build the visible cards and paint them into `#todo-list`. No
 * fetching lives here — the only side effects are the per-card interaction
 * handlers (toggle completion, open edit, open delete), which route through
 * `api` + `store` exactly like the rest of the feature.
 *
 * Contract:
 *   renderList(container, todos, view) -> number   paints filtered cards, returns visible count
 *   renderCard(todo)                   -> HTMLElement
 *   filterTodos(todos, view)           -> Todo[]    filter + search over the loaded list
 */

import { api, ApiError } from '../../api.js';
import { store } from '../../store.js';
import { showToast } from '../../ui/toast.js';
import { openEdit } from './edit.js';
import { openDelete } from './delete.js';

/**
 * IDs seen in the previous paint, so only genuinely new cards animate in.
 * This keeps existing cards from re-flashing on every search keystroke or
 * toggle while still animating a freshly-created todo.
 * @type {Set<number|string>}
 */
let seenIds = new Set();

/**
 * Apply the active filter + case-insensitive search to the loaded list.
 * Search matches on title OR description. Pure — never touches the network.
 * @param {Array<object>} todos
 * @param {{filter?: string, search?: string}} view
 * @returns {Array<object>}
 */
export function filterTodos(todos, view = {}) {
  const q = (view.search || '').trim().toLowerCase();
  const filter = view.filter || 'all';

  return todos.filter((t) => {
    if (filter === 'active' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;
    if (q) {
      const inTitle = (t.title || '').toLowerCase().includes(q);
      const inDesc = (t.description || '').toLowerCase().includes(q);
      if (!inTitle && !inDesc) return false;
    }
    return true;
  });
}

/**
 * Format an ISO timestamp as a short, human date (e.g. "Jul 7, 2026").
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Toggle a todo's completion, then re-fetch so the UI re-renders from server
 * truth. On an ApiError the displayed state is left untouched and a toast fires.
 * @param {object} todo
 */
async function toggleComplete(todo) {
  try {
    await api.updateTodo(todo.id, { completed: !todo.completed });
    await store.refresh();
  } catch (err) {
    const detail = err instanceof ApiError ? err.detail : 'Could not update task';
    showToast(detail, 'error');
  }
}

/** Small icon-button used for the edit / delete actions. */
function actionButton({ label, svg, hoverClass, onClick }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.className =
    'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 ' +
    'transition hover:bg-slate-100 dark:hover:bg-white/10 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 ' +
    hoverClass;
  btn.innerHTML = svg;
  btn.addEventListener('click', onClick);
  return btn;
}

const CHECK_SVG =
  '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">' +
  '<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>';

const EDIT_SVG =
  '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">' +
  '<path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>';

const DELETE_SVG =
  '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">' +
  '<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>';

/**
 * Build a single task card as an `<li>`.
 * @param {object} todo
 * @returns {HTMLElement}
 */
export function renderCard(todo) {
  const li = document.createElement('li');
  li.dataset.id = String(todo.id);

  const card = document.createElement('div');
  card.className = [
    'flex items-start gap-4 rounded-2xl border-l-4 p-5 shadow-sm ring-1 ring-black/5',
    'backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-lg',
    todo.completed
      ? 'border-emerald-500 bg-white/60 opacity-70 dark:bg-white/5'
      : 'border-transparent bg-white/70 dark:bg-white/5',
  ].join(' ');

  // --- Completion checkbox (styled button) ---
  const checkbox = document.createElement('button');
  checkbox.type = 'button';
  checkbox.setAttribute('role', 'checkbox');
  checkbox.setAttribute('aria-checked', String(todo.completed));
  checkbox.setAttribute(
    'aria-label',
    todo.completed ? 'Mark task as active' : 'Mark task as complete',
  );
  checkbox.className = [
    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900',
    todo.completed
      ? 'border-emerald-500 bg-emerald-500 text-white'
      : 'border-slate-300 text-transparent hover:border-emerald-400 dark:border-slate-500',
  ].join(' ');
  checkbox.innerHTML = CHECK_SVG;
  checkbox.addEventListener('click', () => toggleComplete(todo));

  // --- Content (title, description, date) ---
  const content = document.createElement('div');
  content.className = 'min-w-0 flex-1';

  const title = document.createElement('p');
  title.className =
    'break-words text-base font-semibold ' +
    (todo.completed
      ? 'text-slate-400 line-through dark:text-slate-500'
      : 'text-slate-800 dark:text-slate-100');
  title.textContent = todo.title;
  content.appendChild(title);

  if (todo.description) {
    const desc = document.createElement('p');
    desc.className =
      'mt-1 break-words text-sm ' +
      (todo.completed
        ? 'text-slate-400 dark:text-slate-500'
        : 'text-slate-500 dark:text-slate-400');
    desc.textContent = todo.description;
    content.appendChild(desc);
  }

  const date = document.createElement('p');
  date.className = 'mt-2 text-xs font-medium text-slate-400 dark:text-slate-500';
  date.textContent = formatDate(todo.created_at);
  content.appendChild(date);

  // --- Actions (edit, delete) ---
  const actions = document.createElement('div');
  actions.className = 'flex shrink-0 items-center gap-1';
  actions.append(
    actionButton({
      label: 'Edit task',
      svg: EDIT_SVG,
      hoverClass: 'hover:text-indigo-600',
      onClick: () => openEdit(todo),
    }),
    actionButton({
      label: 'Delete task',
      svg: DELETE_SVG,
      hoverClass: 'hover:text-rose-500',
      onClick: () => openDelete(todo),
    }),
  );

  card.append(checkbox, content, actions);
  li.appendChild(card);
  return li;
}

/**
 * Paint the filtered todos into `container`, animating only newly-appeared
 * cards. Returns the number of visible cards so the caller can toggle the
 * empty state.
 * @param {HTMLElement} container
 * @param {Array<object>} todos
 * @param {{filter?: string, search?: string}} view
 * @returns {number} visible card count
 */
export function renderList(container, todos, view) {
  if (!container) return 0;

  const visible = filterTodos(todos, view);
  const nextSeen = new Set();

  const frag = document.createDocumentFragment();
  for (const todo of visible) {
    const card = renderCard(todo);
    if (!seenIds.has(todo.id)) card.classList.add('animate-fade-in-up');
    nextSeen.add(todo.id);
    frag.appendChild(card);
  }

  container.replaceChildren(frag);
  seenIds = nextSeen;
  return visible.length;
}
