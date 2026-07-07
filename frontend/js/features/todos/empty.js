/**
 * features/todos/empty.js — the empty-state block.
 *
 * Shows `#empty-state` with an icon, message, and call-to-action when no todos
 * are visible, distinguishing "no todos at all" from "none match the current
 * filter/search". `hideEmpty` restores the hidden state when cards are present.
 *
 * Contract:
 *   renderEmpty(container, view): void   view = { hasTodos, filter, search }
 *   hideEmpty(container): void
 */

import { store } from '../../store.js';

/**
 * Hide the empty-state block.
 * @param {HTMLElement} container The `#empty-state` element.
 */
export function hideEmpty(container) {
  if (!container) return;
  container.classList.add('hidden');
  container.classList.remove('flex');
}

/**
 * Populate and show the empty-state block.
 * @param {HTMLElement} container The `#empty-state` element.
 * @param {{hasTodos?: boolean, filter?: string, search?: string}} view
 */
export function renderEmpty(container, view = {}) {
  if (!container) return;

  // "Filtered empty" = todos exist but none match the active filter/search.
  const filtered = Boolean(view.hasTodos);

  const icon = document.createElement('div');
  icon.className = 'text-5xl';
  icon.textContent = filtered ? '🔍' : '🗒️';

  const heading = document.createElement('p');
  heading.className = 'mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300';
  heading.textContent = filtered ? 'No matching tasks' : 'No tasks yet';

  const sub = document.createElement('p');
  sub.className = 'mt-1 text-sm text-slate-500 dark:text-slate-400';
  sub.textContent = filtered
    ? 'Try a different search or filter.'
    : 'Add your first task above to get started.';

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className =
    'mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold ' +
    'text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none ' +
    'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900';

  if (filtered) {
    cta.textContent = 'Clear filters';
    cta.addEventListener('click', () => {
      const search = document.getElementById('search-input');
      if (search) search.value = '';
      store.setSearch('');
      store.setFilter('all');
    });
  } else {
    cta.textContent = 'Add a task';
    cta.addEventListener('click', () => {
      document.getElementById('todo-title')?.focus();
    });
  }

  container.replaceChildren(icon, heading, sub, cta);
  container.classList.remove('hidden');
  container.classList.add('flex');
}
