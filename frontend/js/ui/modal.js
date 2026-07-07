/**
 * ui/modal.js — modal open/close primitive.
 *
 * Shows/hides a modal element (already in the DOM, e.g. `#edit-modal`,
 * `#delete-modal`) with a shared dark blurred backdrop, focus trap, and
 * Escape-to-close. One implementation so every modal behaves identically.
 *
 * Contract: openModal(el), closeModal(el).
 *
 * The modal elements themselves live in index.html and are hidden with the
 * `hidden` class; opening swaps `hidden` for `flex` and mounts the backdrop.
 */

const BACKDROP_ID = 'modal-backdrop';

/** Currently-open modal, so the shared keydown/backdrop handlers know the target. */
let activeModal = null;
let lastFocused = null;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), ' +
  'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getBackdrop() {
  let backdrop = document.getElementById(BACKDROP_ID);
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className =
      'fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity';
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

function onKeydown(e) {
  if (!activeModal) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal(activeModal);
    return;
  }

  // Focus trap: keep Tab within the modal.
  if (e.key === 'Tab') {
    const focusable = Array.from(activeModal.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/**
 * Open a modal element with a backdrop and focus trap.
 * @param {HTMLElement} el The modal container (e.g. `#edit-modal`).
 */
export function openModal(el) {
  if (!el) return;

  lastFocused = document.activeElement;
  activeModal = el;

  const backdrop = getBackdrop();
  backdrop.addEventListener('click', () => closeModal(el), { once: true });

  el.classList.remove('hidden');
  el.classList.add('flex');

  // Animate the inner panel if present.
  const panel = el.firstElementChild;
  if (panel) {
    panel.classList.add('animate-modal-pop', 'relative', 'z-50');
  }

  document.addEventListener('keydown', onKeydown);
  document.body.style.overflow = 'hidden';

  // Move focus into the modal.
  const focusTarget = el.querySelector(FOCUSABLE);
  if (focusTarget) focusTarget.focus();
}

/**
 * Close a modal element and remove the backdrop.
 * @param {HTMLElement} el The modal container.
 */
export function closeModal(el) {
  if (!el) return;

  el.classList.add('hidden');
  el.classList.remove('flex');

  const panel = el.firstElementChild;
  if (panel) panel.classList.remove('animate-modal-pop');

  const backdrop = document.getElementById(BACKDROP_ID);
  if (backdrop) backdrop.remove();

  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';

  if (activeModal === el) activeModal = null;

  // Restore focus to whatever opened the modal.
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
    lastFocused = null;
  }
}
