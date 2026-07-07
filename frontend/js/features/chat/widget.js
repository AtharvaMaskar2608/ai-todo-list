/**
 * features/chat/widget.js — floating panel open/close behavior.
 *
 * The shell owns the markup (Contracts §4): `#ai-panel` is fixed bottom-right
 * and holds the toggle button plus a chat window (`[data-ai-window]`) that
 * starts `hidden`. Opening just toggles that window's visibility — the panel
 * overlays app chrome but never disables the Todo list, so tasks stay
 * interactive and update live while the user chats. Conversation state lives in
 * `client.js`, not the DOM, so closing/reopening preserves history.
 *
 * Contract (this feature): open(), close(), toggle(), isOpen().
 */

/** @returns {HTMLElement|null} the chat window inside the shell-owned panel. */
function windowEl() {
  const panel = document.getElementById('ai-panel');
  return panel ? panel.querySelector('[data-ai-window]') : null;
}

/** @returns {boolean} whether the chat window is currently visible. */
export function isOpen() {
  const w = windowEl();
  return !!w && !w.classList.contains('hidden');
}

/** Show the chat window and focus the input. No-op if the window is absent. */
export function open() {
  const w = windowEl();
  if (!w) return;
  // The window is a flex column; swap `hidden` for `flex` so its layout applies.
  w.classList.remove('hidden');
  w.classList.add('flex');
  const input = document.getElementById('ai-input');
  if (input) input.focus();
}

/** Hide the chat window (conversation state is retained). */
export function close() {
  const w = windowEl();
  if (!w) return;
  w.classList.add('hidden');
  w.classList.remove('flex');
}

/** Toggle the chat window between open and closed. */
export function toggle() {
  if (isOpen()) close();
  else open();
}
