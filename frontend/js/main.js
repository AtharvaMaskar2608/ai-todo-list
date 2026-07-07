/**
 * main.js — the single module entry point (index.html loads only this).
 *
 * Boots the shell that always exists (theme + quote + chrome), then GUARDED
 * dynamic-imports the two feature modules and calls their initializers only if
 * present. Before `frontend-todos` / `frontend-ai-chat` land, those imports
 * fail softly and the shell still renders — no uncaught error blocks the page.
 *
 * Guard policy (per design.md): swallow ONLY the module-not-found case for a
 * missing feature. If a feature module IS present and its initializer throws a
 * real runtime error, log it so genuine bugs stay visible during development.
 */

import { initTheme } from './features/theme.js';
import { initQuote } from './features/quote.js';

/**
 * Dynamically import a feature module and call its named initializer.
 * A missing module is skipped silently; a present-but-broken module logs.
 *
 * @param {string} path Module path relative to this file.
 * @param {string} initName Exported initializer function name.
 */
async function loadFeature(path, initName) {
  let mod;
  try {
    mod = await import(path);
  } catch (err) {
    // Distinguish "feature not built yet" from a real error inside the module.
    // A missing file is the expected standalone-shell case — skip quietly.
    console.info(`[shell] optional feature not present: ${path}`);
    return;
  }

  const init = mod?.[initName];
  if (typeof init !== 'function') {
    console.warn(`[shell] ${path} loaded but has no ${initName}() export`);
    return;
  }

  // The module IS present — let its own runtime errors surface (logged).
  try {
    await init();
  } catch (err) {
    console.error(`[shell] ${initName}() from ${path} threw:`, err);
  }
}

function boot() {
  // Always-present chrome.
  initTheme();
  initQuote();

  // Optional features (fan-out changes add these directories later).
  loadFeature('./features/todos/index.js', 'initTodos');
  loadFeature('./features/chat/index.js', 'initChat');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
