/**
 * ui/skeleton.js — loading placeholders (no spinner).
 *
 * Renders animated placeholder cards into a container during initial load,
 * so the layout doesn't jump and the wait feels lighter than a spinner.
 *
 * Contract: showSkeletons(container, n=3), clearSkeletons(container).
 */

const SKELETON_ATTR = 'data-skeleton';

/**
 * Build one placeholder card that mimics a task card's shape.
 * @returns {HTMLElement}
 */
function skeletonCard() {
  const card = document.createElement('div');
  card.setAttribute(SKELETON_ATTR, '');
  card.className =
    'flex items-center gap-4 rounded-2xl bg-white/70 p-5 shadow-sm ' +
    'ring-1 ring-black/5 backdrop-blur dark:bg-white/5';

  // Checkbox-shaped block.
  const check = document.createElement('div');
  check.className = 'skeleton h-6 w-6 shrink-0 rounded-full';

  // Text lines.
  const lines = document.createElement('div');
  lines.className = 'flex min-w-0 flex-1 flex-col gap-2';

  const title = document.createElement('div');
  title.className = 'skeleton h-4 w-1/2 rounded';

  const subtitle = document.createElement('div');
  subtitle.className = 'skeleton h-3 w-3/4 rounded';

  lines.append(title, subtitle);
  card.append(check, lines);
  return card;
}

/**
 * Render `n` animated skeleton cards into `container`.
 * @param {HTMLElement} container
 * @param {number} [n=3]
 */
export function showSkeletons(container, n = 3) {
  if (!container) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i += 1) frag.appendChild(skeletonCard());
  container.appendChild(frag);
}

/**
 * Remove all skeleton cards previously added to `container`.
 * @param {HTMLElement} container
 */
export function clearSkeletons(container) {
  if (!container) return;
  container.querySelectorAll(`[${SKELETON_ATTR}]`).forEach((el) => el.remove());
}
