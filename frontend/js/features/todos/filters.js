/**
 * features/todos/filters.js — live search + All/Active/Completed pills.
 *
 * Search and filter are pure view operations over the loaded list — never
 * network calls. Typing writes to `store.setSearch`; the pills write to
 * `store.setFilter`; the store notifies and the render layer recomputes the
 * visible cards. This module also keeps the active pill filled and the others
 * outlined by reacting to store changes.
 *
 * Contract: initFilters(): void
 */

import { store } from '../../store.js';

/** @type {Array<'all'|'active'|'completed'>} */
const FILTERS = ['all', 'active', 'completed'];

const ACTIVE_PILL =
  'rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition ' +
  'hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900';

const INACTIVE_PILL =
  'rounded-full bg-white/70 px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-black/5 ' +
  'backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ' +
  'dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 dark:focus:ring-offset-slate-900';

/** Paint each pill filled/outlined according to the current store filter. */
function reflectPills() {
  for (const f of FILTERS) {
    const btn = document.getElementById(`filter-${f}`);
    if (!btn) continue;
    const active = store.filter === f;
    btn.className = active ? ACTIVE_PILL : INACTIVE_PILL;
    btn.setAttribute('aria-pressed', String(active));
  }
}

/**
 * Wire the search input and filter pills to the store.
 */
export function initFilters() {
  const search = document.getElementById('search-input');
  if (search) {
    search.addEventListener('input', () => store.setSearch(search.value));
  }

  for (const f of FILTERS) {
    const btn = document.getElementById(`filter-${f}`);
    if (!btn) continue;
    btn.addEventListener('click', () => store.setFilter(f));
  }

  // Keep the pill styling in sync with the authoritative store state.
  store.subscribe(reflectPills);
  reflectPills();
}
