/**
 * features/todos/delete.js — delete a todo through `#delete-modal`.
 *
 * Opens the shell-owned confirmation modal. Confirming closes the modal,
 * animates the card out (via the `.animate-fade-out-down` helper in the shell
 * stylesheet), then calls `api.deleteTodo`, toasts, and refreshes the store.
 * Cancel closes and leaves the task in place.
 *
 * Contract: openDelete(todo): void
 */

import { api, ApiError } from '../../api.js';
import { store } from '../../store.js';
import { showToast } from '../../ui/toast.js';
import { openModal, closeModal } from '../../ui/modal.js';

/** Must match the `.animate-fade-out-down` duration in css/style.css (0.22s). */
const EXIT_ANIM_MS = 220;

/**
 * Open the delete-confirmation modal for a todo.
 * @param {object} todo
 */
export function openDelete(todo) {
  const modal = document.getElementById('delete-modal');
  const body = modal?.querySelector('[data-modal-body]');
  if (!modal || !body) return;

  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-5';

  const msg = document.createElement('p');
  msg.className = 'text-sm leading-relaxed text-slate-600 dark:text-slate-300';
  // textContent keeps user-supplied titles from being interpreted as HTML.
  msg.textContent = `“${todo.title}” will be permanently removed. This can’t be undone.`;

  const actions = document.createElement('div');
  actions.className = 'flex justify-end gap-3';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className =
    'rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition ' +
    'hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:bg-white/10';
  cancelBtn.addEventListener('click', () => closeModal(modal));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.textContent = 'Delete';
  deleteBtn.className =
    'rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 ' +
    'transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 ' +
    'disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-800';

  deleteBtn.addEventListener('click', async () => {
    deleteBtn.disabled = true;
    closeModal(modal);

    // Animate the card out before the request so the removal reads smoothly.
    const card = document.querySelector(`#todo-list [data-id="${CSS.escape(String(todo.id))}"]`);
    if (card) {
      card.classList.remove('animate-fade-in-up');
      card.classList.add('animate-fade-out-down');
      await new Promise((resolve) => setTimeout(resolve, EXIT_ANIM_MS));
    }

    try {
      await api.deleteTodo(todo.id);
      showToast('Task deleted', 'success');
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : 'Could not delete task';
      showToast(detail, 'error');
    } finally {
      // Refresh either way: success removes it, failure restores the card.
      await store.refresh();
    }
  });

  actions.append(cancelBtn, deleteBtn);
  wrap.append(msg, actions);
  body.replaceChildren(wrap);
  openModal(modal);
}
