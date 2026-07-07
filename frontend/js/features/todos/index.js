/**
 * features/todos/index.js — feature entry point.
 *
 * `initTodos()` wires the create form and filters, subscribes to the store, and
 * kicks off the initial load. The store is the single source of truth: every
 * change (create/toggle/edit/delete, setFilter/setSearch, or an AI-driven
 * `store.refresh()`) repaints `#todo-list`, the stats/progress, and the empty
 * state. There is no local copy of the todo array.
 *
 * Contract: export function initTodos(): void
 */

import { store } from '../../store.js';
import { showToast } from '../../ui/toast.js';
import { showSkeletons, clearSkeletons } from '../../ui/skeleton.js';
import { renderList } from './render.js';
import { initForm } from './form.js';
import { initFilters } from './filters.js';
import { renderStats } from './stats.js';
import { renderEmpty, hideEmpty } from './empty.js';

/**
 * Boot the todo feature: wire inputs, subscribe for reactive re-render, and
 * perform the initial fetch behind skeleton placeholders.
 */
export function initTodos() {
  const listEl = document.getElementById('todo-list');
  const emptyEl = document.getElementById('empty-state');
  if (!listEl) return;

  initForm();
  initFilters();

  // Repaint on every store change — the DOM is a pure function of store state.
  store.subscribe((todos) => {
    clearSkeletons(listEl);

    const view = { filter: store.filter, search: store.search };
    renderStats(todos);

    const visibleCount = renderList(listEl, todos, view);
    if (visibleCount === 0) {
      listEl.classList.add('hidden');
      renderEmpty(emptyEl, {
        hasTodos: todos.length > 0,
        filter: view.filter,
        search: view.search,
      });
    } else {
      hideEmpty(emptyEl);
      listEl.classList.remove('hidden');
    }
  });

  // Initial load: show skeletons, then fetch. The subscription paints the real
  // cards once `refresh()` notifies.
  showSkeletons(listEl, 3);
  store.refresh().catch((err) => {
    clearSkeletons(listEl);
    showToast(err?.detail || 'Could not load tasks', 'error');
  });
}
