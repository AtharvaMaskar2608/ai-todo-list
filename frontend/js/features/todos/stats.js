/**
 * features/todos/stats.js — stat counts, progress bar, and confetti.
 *
 * Recomputes the all/active/completed counts and completion percentage from the
 * FULL todo list (independent of filter/search) on every store change, bumps a
 * stat card when its value changes, animates the progress bar width, and fires
 * a one-shot confetti burst when a non-empty list becomes fully complete.
 *
 * All animation is done in JS (Web Animations API + a DOM confetti layer) so
 * this feature never edits the shell-owned stylesheet.
 *
 * Contract: renderStats(todos): void
 */

/**
 * One-shot guard: confetti fires when the list flips to fully-complete, then is
 * suppressed until at least one task becomes active again (re-arming it).
 * Module scope — resets on reload, which is the intended per-session behavior.
 */
let celebrated = false;

/**
 * Set a stat card's number, bumping it if the value changed.
 * @param {string} id
 * @param {number} value
 */
function setStat(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  const next = String(value);
  if (el.textContent === next) return;

  el.textContent = next;
  if (typeof el.animate === 'function') {
    el.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.25)' },
        { transform: 'scale(1)' },
      ],
      { duration: 300, easing: 'ease-out' },
    );
  }
}

/** Fire a short confetti burst (respects reduced-motion). */
function fireConfetti() {
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'pointer-events-none fixed inset-0 z-[200] overflow-hidden';
  document.body.appendChild(layer);

  const colors = ['#6366f1', '#0ea5e9', '#22c55e', '#eab308', '#ec4899', '#f97316'];
  const count = 100;
  let maxLife = 0;

  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('div');
    const size = 6 + Math.random() * 6;
    piece.style.position = 'absolute';
    piece.style.top = '-12px';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.6}px`;
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.borderRadius = '1px';
    layer.appendChild(piece);

    const duration = 2200 + Math.random() * 1500;
    const delay = Math.random() * 300;
    const drift = (Math.random() - 0.5) * 240;
    const spin = (Math.random() - 0.5) * 720;
    maxLife = Math.max(maxLife, duration + delay);

    piece.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${drift}px, 105vh) rotate(${spin}deg)`, opacity: 1, offset: 0.9 },
        { transform: `translate(${drift}px, 112vh) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration, delay, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards' },
    );
  }

  setTimeout(() => layer.remove(), maxLife + 500);
}

/**
 * Recompute stats, progress, and the confetti state from the full todo list.
 * @param {Array<object>} todos
 */
export function renderStats(todos) {
  const list = Array.isArray(todos) ? todos : [];
  const all = list.length;
  const completed = list.filter((t) => t.completed).length;
  const active = all - completed;

  setStat('stat-all', all);
  setStat('stat-active', active);
  setStat('stat-completed', completed);

  const pct = all === 0 ? 0 : Math.round((completed / all) * 100);
  const bar = document.getElementById('progress-bar');
  const label = document.getElementById('progress-label');
  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}% Complete`;

  // Confetti: once when everything is done; re-arm when a task becomes active.
  if (active > 0) celebrated = false;
  const allDone = all > 0 && active === 0;
  if (allDone && !celebrated) {
    celebrated = true;
    fireConfetti();
  }
}
