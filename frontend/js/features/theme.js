/**
 * features/theme.js — dark-mode theming with persistence.
 *
 * Tailwind's darkMode is 'class', so every `dark:` utility responds to a single
 * `dark` class on <html>. `initTheme` applies the persisted preference (or the
 * OS `prefers-color-scheme` on first visit), wires `#theme-toggle`, and writes
 * the choice to localStorage on every toggle so it survives reloads.
 *
 * Contract: initTheme().
 */

const STORAGE_KEY = 'todo-theme';

/** @returns {boolean} whether dark mode should be active on this load. */
function prefersDark() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  // First visit: fall back to the OS preference.
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * @param {boolean} dark
 */
function apply(dark) {
  document.documentElement.classList.toggle('dark', dark);
}

/**
 * Initialize theming: apply the stored/OS preference and wire the toggle.
 */
export function initTheme() {
  // Apply immediately so there's no flash of the wrong theme.
  apply(prefersDark());

  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const nowDark = !document.documentElement.classList.contains('dark');
    apply(nowDark);
    localStorage.setItem(STORAGE_KEY, nowDark ? 'dark' : 'light');
  });
}
