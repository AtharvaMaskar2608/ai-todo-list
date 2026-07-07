/**
 * features/quote.js — random motivational quote on load.
 *
 * Picks one random quote and renders it into `#quote` on each page load.
 *
 * Contract: initQuote().
 */

const QUOTES = [
  '🚀 One task at a time.',
  '🌟 Small progress is still progress.',
  '💪 Focus on what matters.',
  '🔥 Make today count.',
  '🎯 Done is better than perfect.',
  '✨ Progress beats perfection.',
  '🌱 Start where you are.',
  '☀️ A little each day adds up.',
];

/**
 * Render one randomly-selected quote into `#quote`.
 */
export function initQuote() {
  const el = document.getElementById('quote');
  if (!el) return;

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  el.textContent = quote;
}
