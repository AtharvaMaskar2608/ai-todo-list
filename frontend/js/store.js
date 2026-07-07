/**
 * store.js — reactive state + pub/sub sync backbone.
 *
 * Holds the loaded todos plus view state (`filter`, `search`). Every mutation
 * runs a private `notify()` that invokes every subscriber with the current
 * todos. This is what keeps the two features in sync WITHOUT them referencing
 * each other:
 *   - The todo feature subscribes and re-renders on every notify.
 *   - The chat feature, after a `todos_changed` reply, calls `store.refresh()`,
 *     which re-fetches and notifies — so the list updates on its own.
 *
 * Contract (CONTRACTS.md §4):
 *   store.getTodos()          -> Todo[]        current in-memory todos
 *   store.refresh()           -> Promise<void> re-fetch via api then notify
 *   store.setTodos(list)      -> void          replace + notify
 *   store.subscribe(fn)       -> () => void    returns an unsubscribe function
 *   store.filter              'all'|'active'|'completed'  (default 'all')
 *   store.search              string           (default '')
 *   store.setFilter(f)        -> void          set + notify
 *   store.setSearch(q)        -> void          set + notify
 */

import { api } from './api.js';

/** @type {Array<object>} */
let todos = [];

/** @type {Set<Function>} */
const subscribers = new Set();

/** Notify every current subscriber with the current todos. */
function notify() {
  for (const fn of subscribers) {
    try {
      fn(todos);
    } catch (err) {
      // A misbehaving subscriber must not break the notify loop for others.
      console.error('[store] subscriber threw:', err);
    }
  }
}

export const store = {
  /** View state: which subset of todos to show. */
  filter: 'all',
  /** View state: current search query. */
  search: '',

  /** @returns {Array<object>} the current in-memory todos. */
  getTodos() {
    return todos;
  },

  /**
   * Replace the stored todos and notify subscribers.
   * @param {Array<object>} list
   */
  setTodos(list) {
    todos = Array.isArray(list) ? list : [];
    notify();
  },

  /**
   * Re-fetch todos from the backend, replace the stored list, and notify.
   * @returns {Promise<void>}
   */
  async refresh() {
    const list = await api.listTodos();
    this.setTodos(list);
  },

  /**
   * Set the active filter and notify.
   * @param {'all'|'active'|'completed'} f
   */
  setFilter(f) {
    this.filter = f;
    notify();
  },

  /**
   * Set the search query and notify.
   * @param {string} q
   */
  setSearch(q) {
    this.search = q;
    notify();
  },

  /**
   * Register a subscriber, invoked with the current todos on every mutation.
   * @param {Function} fn
   * @returns {() => void} unsubscribe function
   */
  subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
};
