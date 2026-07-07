/**
 * features/chat/conversation.js — renders the chat transcript into `#ai-messages`.
 *
 * Owns everything that appears in the message pane: user vs assistant bubbles
 * (visually distinct), tool-activity chips, a "thinking" loading indicator, and
 * auto-scroll to the newest content. All user- and model-supplied text is set
 * via `textContent` (never `innerHTML`) so replies can't inject markup (XSS-safe).
 *
 * Contract (this feature):
 *   renderMessage({ role, content })   — append a user/assistant bubble.
 *   renderToolActivity(items)          — append a chip per `{ summary }` entry.
 *   showLoading() / hideLoading()      — the awaiting-reply indicator.
 *   scrollToLatest()                   — pin the pane to the bottom.
 */

/** @returns {HTMLElement|null} the shell-owned message pane. */
function messagesEl() {
  return document.getElementById('ai-messages');
}

/**
 * Append a chat bubble. User bubbles are right-aligned/indigo; assistant bubbles
 * are left-aligned/neutral — the two are unmistakable.
 *
 * @param {{ role: 'user' | 'assistant', content: string }} message
 */
export function renderMessage({ role, content }) {
  const el = messagesEl();
  if (!el) return;

  const isUser = role === 'user';

  const row = document.createElement('div');
  row.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;

  const bubble = document.createElement('div');
  bubble.className = isUser
    ? 'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-indigo-600 px-3.5 py-2 text-sm text-white'
    : 'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2 text-sm text-slate-800 dark:bg-white/10 dark:text-slate-100';
  // textContent — never innerHTML — for user- and model-supplied strings.
  bubble.textContent = content;

  row.appendChild(bubble);
  el.appendChild(row);
  scrollToLatest();
}

/**
 * Append a compact chip for each tool-activity entry, grouped as one row so the
 * steps sit with the assistant turn that produced them. A missing/empty list or
 * an entry without a `summary` renders nothing.
 *
 * @param {Array<{ tool?: string, summary?: string }>} items
 */
export function renderToolActivity(items) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return;

  const el = messagesEl();
  if (!el) return;

  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap justify-start gap-1.5';

  for (const item of list) {
    const summary = item?.summary;
    if (typeof summary !== 'string' || summary.length === 0) continue;

    const chip = document.createElement('span');
    chip.className =
      'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ' +
      'ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20';
    chip.textContent = summary;
    wrap.appendChild(chip);
  }

  // All entries lacked a usable summary — append nothing.
  if (wrap.childElementCount === 0) return;

  el.appendChild(wrap);
  scrollToLatest();
}

/** The single live loading row, if shown. */
let loadingEl = null;

/** Show an animated "thinking" indicator (idempotent while already shown). */
export function showLoading() {
  const el = messagesEl();
  if (!el || loadingEl) return;

  const row = document.createElement('div');
  row.className = 'flex justify-start';
  row.setAttribute('data-ai-loading', '');

  const bubble = document.createElement('div');
  bubble.className =
    'flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5 dark:bg-white/10';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-label', 'Assistant is thinking');

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.className = 'h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500';
    dot.style.animationDelay = `${i * 0.15}s`;
    bubble.appendChild(dot);
  }

  row.appendChild(bubble);
  el.appendChild(row);
  loadingEl = row;
  scrollToLatest();
}

/** Remove the loading indicator, if present. */
export function hideLoading() {
  if (loadingEl) {
    loadingEl.remove();
    loadingEl = null;
  }
}

/** Scroll the message pane so the most recent content is visible. */
export function scrollToLatest() {
  const el = messagesEl();
  if (el) el.scrollTop = el.scrollHeight;
}
