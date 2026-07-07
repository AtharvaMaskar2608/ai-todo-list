/**
 * features/chat/index.js — the chat feature entry point.
 *
 * Dynamic-imported by the shell's `main.js` (Contracts §4). `initChat()` wires
 * the floating widget, the conversation renderer, and the network client
 * against the pre-existing `#ai-*` mount points. Idempotent, and a no-op if
 * `#ai-panel` is absent (defensive — the shell always provides it).
 *
 * Send lifecycle: render the user turn immediately, lock the input + show a
 * loading indicator while the request is in flight (loading doubles as the
 * lock), then render the tool-activity chips and the assistant reply. On
 * failure, remove the indicator, re-enable the controls with the typed message
 * preserved, and surface the error via a toast so the user can retry.
 *
 * Contract (this feature): export function initChat(): void.
 */

import { sendMessage } from './client.js';
import * as widget from './widget.js';
import {
  renderMessage,
  renderToolActivity,
  showLoading,
  hideLoading,
} from './conversation.js';
import { showToast } from '../../ui/toast.js';

/** Guard so repeat calls don't double-bind handlers. */
let wired = false;

/**
 * Wire the chat widget end to end. Safe to call more than once.
 */
export function initChat() {
  const panel = document.getElementById('ai-panel');
  if (!panel) return; // shell always provides it; defensive no-op
  if (wired) return; // idempotent
  wired = true;

  const toggle = document.getElementById('ai-toggle');
  const input = document.getElementById('ai-input');
  const send = document.getElementById('ai-send');

  /** True while a request is in flight — the loading state IS the submit lock. */
  let inFlight = false;

  /** Enable/disable the input and send control together. */
  function setBusy(busy) {
    inFlight = busy;
    if (input) input.disabled = busy;
    if (send) send.disabled = busy;
  }

  /** Read, validate, send one message, and render the result or the error. */
  async function submit() {
    if (inFlight) return; // ignore double-submits while a request runs
    const text = input ? input.value.trim() : '';
    if (!text) return;

    // Show the user's turn immediately, then lock + show the loading indicator.
    renderMessage({ role: 'user', content: text });
    if (input) input.value = '';
    setBusy(true);
    showLoading();

    try {
      const { reply, tool_activity } = await sendMessage(text);
      hideLoading();
      // Chips first (what happened), then the single concise reply for the turn.
      renderToolActivity(tool_activity);
      renderMessage({ role: 'assistant', content: reply });
    } catch (err) {
      hideLoading();
      // Preserve the typed message so the user can retry without retyping.
      if (input) input.value = text;
      const detail =
        err?.detail || err?.message || 'Something went wrong. Please try again.';
      showToast(detail, 'error');
    } finally {
      setBusy(false);
      if (input) input.focus();
    }
  }

  if (toggle) toggle.addEventListener('click', () => widget.toggle());
  if (send) send.addEventListener('click', submit);
  if (input) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    });
  }
}
