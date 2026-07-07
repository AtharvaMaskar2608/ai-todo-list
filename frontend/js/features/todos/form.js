/**
 * features/todos/form.js — the create-task form.
 *
 * Wires `#todo-form`: trims + requires a title, disables submit while the
 * request is in flight, calls `api.createTodo`, then clears the inputs, toasts,
 * and refreshes the store (which repaints the list — the new card animates in
 * via the render layer's new-id detection). Enter submits natively via `<form>`.
 *
 * Contract: initForm(): void
 */

import { api, ApiError } from '../../api.js';
import { store } from '../../store.js';
import { showToast } from '../../ui/toast.js';

/**
 * Attach the submit handler to the create form. No-op if the mount is absent.
 */
export function initForm() {
  const form = document.getElementById('todo-form');
  const titleInput = document.getElementById('todo-title');
  const descInput = document.getElementById('todo-desc');
  if (!form || !titleInput) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    // Empty-after-trim title never submits.
    if (!title) {
      titleInput.focus();
      return;
    }
    const description = (descInput?.value || '').trim() || null;

    if (submitBtn) submitBtn.disabled = true;
    try {
      await api.createTodo({ title, description });
      titleInput.value = '';
      if (descInput) descInput.value = '';
      showToast('Task added', 'success');
      await store.refresh();
      titleInput.focus();
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : 'Could not add task';
      showToast(detail, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
