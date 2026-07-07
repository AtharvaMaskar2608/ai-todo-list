/**
 * features/todos/edit.js — edit a todo through `#edit-modal`.
 *
 * Populates the shell-owned edit modal with a form prefilled from the todo,
 * then on Save sends only the changed fields via `api.updateTodo`, closes the
 * modal, toasts, and refreshes the store. Cancel closes with no request.
 * Backdrop/focus-trap/Escape are provided by `ui/modal`.
 *
 * Contract: openEdit(todo): void
 */

import { api, ApiError } from '../../api.js';
import { store } from '../../store.js';
import { showToast } from '../../ui/toast.js';
import { openModal, closeModal } from '../../ui/modal.js';

const FIELD_CLASS =
  'w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-base text-slate-800 ' +
  'shadow-sm ring-1 ring-black/5 transition placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-white/10 dark:text-slate-100';

const LABEL_CLASS =
  'mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300';

/**
 * Open the edit modal for a todo.
 * @param {object} todo
 */
export function openEdit(todo) {
  const modal = document.getElementById('edit-modal');
  const body = modal?.querySelector('[data-modal-body]');
  if (!modal || !body) return;

  const form = document.createElement('form');
  form.className = 'flex flex-col gap-4';
  form.noValidate = true;

  // Title
  const titleLabel = document.createElement('label');
  titleLabel.className = LABEL_CLASS;
  titleLabel.textContent = 'Title';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.maxLength = 100;
  titleInput.value = todo.title || '';
  titleInput.className = FIELD_CLASS;
  const titleId = 'edit-title-input';
  titleInput.id = titleId;
  titleLabel.setAttribute('for', titleId);

  // Description
  const descLabel = document.createElement('label');
  descLabel.className = LABEL_CLASS;
  descLabel.textContent = 'Description';
  const descInput = document.createElement('textarea');
  descInput.rows = 3;
  descInput.maxLength = 500;
  descInput.value = todo.description || '';
  descInput.className = `${FIELD_CLASS} resize-none`;
  const descId = 'edit-desc-input';
  descInput.id = descId;
  descLabel.setAttribute('for', descId);

  // Completed toggle
  const completedWrap = document.createElement('label');
  completedWrap.className =
    'flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300';
  const completedInput = document.createElement('input');
  completedInput.type = 'checkbox';
  completedInput.checked = Boolean(todo.completed);
  completedInput.className = 'h-4 w-4 rounded accent-emerald-500';
  const completedText = document.createElement('span');
  completedText.textContent = 'Mark as completed';
  completedWrap.append(completedInput, completedText);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'mt-2 flex justify-end gap-3';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className =
    'rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition ' +
    'hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:bg-white/10';
  cancelBtn.addEventListener('click', () => closeModal(modal));

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save';
  saveBtn.className =
    'rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 ' +
    'transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ' +
    'disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-800';

  actions.append(cancelBtn, saveBtn);
  form.append(titleLabel, titleInput, descLabel, descInput, completedWrap, actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }

    // Build a patch of only the fields that actually changed.
    const newDesc = descInput.value.trim() || null;
    const oldDesc = todo.description || null;
    const patch = {};
    if (title !== todo.title) patch.title = title;
    if (newDesc !== oldDesc) patch.description = newDesc;
    if (completedInput.checked !== Boolean(todo.completed)) {
      patch.completed = completedInput.checked;
    }

    if (Object.keys(patch).length === 0) {
      closeModal(modal);
      return;
    }

    saveBtn.disabled = true;
    try {
      await api.updateTodo(todo.id, patch);
      closeModal(modal);
      showToast('Task updated', 'success');
      await store.refresh();
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : 'Could not update task';
      showToast(detail, 'error');
      saveBtn.disabled = false;
    }
  });

  body.replaceChildren(form);
  openModal(modal);
}
