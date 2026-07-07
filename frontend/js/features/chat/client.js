/**
 * features/chat/client.js — session state + the single chat network call.
 *
 * Holds the in-memory conversation as `messages[]` of
 * `{ role: 'user' | 'assistant', content: string }`. The backend is stateless
 * (Contracts §3), so every turn posts the FULL array via `api.chat(messages)`.
 * When a reply reports `todos_changed`, we call `store.refresh()` so the main
 * Todo list re-renders on its own (Contracts §4/§5) — the chat feature never
 * touches the list DOM.
 *
 * No persistence: a page reload starts an empty conversation by design.
 *
 * Contract (this feature):
 *   sendMessage(text): Promise<{ reply, tool_activity, todos_changed }>
 *     - appends the user turn, POSTs the full messages[], appends the assistant
 *       reply, refreshes the store on `todos_changed`, and returns the parsed
 *       response. Rejects (rolling back the optimistic user turn) if api.chat throws.
 *   getMessages(): messages[]   — the live session history (read-only use).
 */

import { api } from '../../api.js';
import { store } from '../../store.js';
import { showToast } from '../../ui/toast.js';

/** @type {Array<{ role: 'user' | 'assistant', content: string }>} */
const messages = [];

/** @returns {Array<{ role: string, content: string }>} the session history. */
export function getMessages() {
  return messages;
}

/**
 * Send one user turn: append it, POST the full history, append the assistant
 * reply, and refresh the store when the AI changed todos.
 *
 * @param {string} text The user's message.
 * @returns {Promise<{ reply: string, tool_activity: Array<{tool?: string, summary: string}>, todos_changed: boolean }>}
 * @throws {import('../../api.js').ApiError} if `api.chat` fails (user turn rolled back).
 */
export async function sendMessage(text) {
  const userTurn = { role: 'user', content: text };
  messages.push(userTurn);

  let response;
  try {
    response = await api.chat(messages);
  } catch (err) {
    // Roll back the optimistic user turn so the session history holds only
    // completed exchanges. The caller preserves the typed text for a retry.
    const idx = messages.lastIndexOf(userTurn);
    if (idx !== -1) messages.splice(idx, 1);
    throw err;
  }

  // Consume backend fields defensively (Contracts §3): missing tool_activity is
  // no chips; missing todos_changed is falsy.
  const reply = typeof response?.reply === 'string' ? response.reply : '';
  const toolActivity = Array.isArray(response?.tool_activity) ? response.tool_activity : [];
  const todosChanged = response?.todos_changed === true;

  messages.push({ role: 'assistant', content: reply });

  if (todosChanged) {
    try {
      await store.refresh();
    } catch (err) {
      // The mutation already succeeded server-side and the reply still renders,
      // so don't fail the turn — just flag the stale list so the user can retry.
      console.error('[chat] store.refresh() after todos_changed failed:', err);
      showToast('Could not refresh the task list — it may be out of date.', 'error');
    }
  }

  return { reply, tool_activity: toolActivity, todos_changed: todosChanged };
}
