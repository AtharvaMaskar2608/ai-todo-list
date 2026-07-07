/**
 * ui/toast.js — transient toast notifications.
 *
 * Renders a toast into `#toast-container` (top-right, owned by the shell) and
 * auto-removes it after 3 seconds. One shared implementation used by every
 * feature so success / error / info feedback looks consistent.
 *
 * Contract: showToast(message, type) — type in 'success' | 'error' | 'info'.
 */

const AUTO_DISMISS_MS = 3000;
const EXIT_ANIM_MS = 250; // must match .toast-exit in style.css

/** Per-type styling + leading icon. */
const VARIANTS = {
  success: {
    icon: '✅',
    classes: 'bg-emerald-500 text-white',
  },
  error: {
    icon: '❌',
    classes: 'bg-rose-500 text-white',
  },
  info: {
    icon: 'ℹ️',
    classes: 'bg-indigo-600 text-white',
  },
};

/**
 * Show a toast notification.
 * @param {string} message Text to display.
 * @param {'success'|'error'|'info'} [type='info']
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const variant = VARIANTS[type] || VARIANTS.info;

  const toast = document.createElement('div');
  toast.className =
    `toast-enter pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 ` +
    `text-sm font-semibold shadow-lg ring-1 ring-black/5 ${variant.classes}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon = document.createElement('span');
  icon.className = 'text-base leading-none';
  icon.textContent = variant.icon;

  const text = document.createElement('span');
  text.className = 'min-w-0 flex-1';
  text.textContent = message;

  toast.append(icon, text);
  container.appendChild(toast);

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), EXIT_ANIM_MS);
  };

  setTimeout(remove, AUTO_DISMISS_MS);

  return toast;
}
