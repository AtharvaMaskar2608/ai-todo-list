/**
 * config.js — app-wide configuration constants.
 *
 * The single source of truth for the backend origin. All network requests are
 * built from this base in `api.js`; no other module hard-codes a URL.
 */

/** Backend API origin (FastAPI dev server). */
export const API_BASE_URL = 'http://localhost:8000';
