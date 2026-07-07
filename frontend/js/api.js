/**
 * api.js — the SOLE network layer.
 *
 * Only this module calls `fetch`. Every method builds its URL from
 * `API_BASE_URL` and normalizes failure into a single thrown type,
 * `ApiError(status, detail)`, so callers never branch on `response.ok`:
 * they `try/catch` and show a toast.
 *
 * Failure mapping:
 *   - Non-2xx HTTP response  -> ApiError(status, detail-from-body)
 *   - Network / CORS failure -> ApiError(0, message)  (status 0 = transport)
 *
 * Contract (CONTRACTS.md §4):
 *   api.listTodos()                       -> Todo[]        GET    /todos
 *   api.getTodo(id)                       -> Todo          GET    /todos/{id}
 *   api.createTodo({title, description})  -> Todo          POST   /todos
 *   api.updateTodo(id, patch)             -> Todo          PUT    /todos/{id}
 *   api.deleteTodo(id)                    -> void          DELETE /todos/{id}
 *   api.chat(messages)                    -> {reply, tool_activity, todos_changed}
 *                                                          POST   /agent/chat
 */

import { API_BASE_URL } from './config.js';

/**
 * Uniform error thrown by every `api` method on any failure.
 * @property {number} status HTTP status code, or 0 for a transport failure.
 * @property {string} detail Human-readable message (from the body's `detail`).
 */
export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed (status ${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Core request helper. Wraps fetch, maps every non-2xx into an ApiError, and
 * parses JSON when there's a body to parse.
 *
 * @param {string} path      URL path beginning with '/'.
 * @param {RequestInit} [options]
 * @returns {Promise<any|null>} Parsed JSON, or null for empty (204) responses.
 * @throws {ApiError}
 */
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch (err) {
    // Network down, DNS failure, CORS block, etc. — never reached the server.
    throw new ApiError(0, err?.message || 'Network request failed');
  }

  if (!response.ok) {
    // Try to pull `detail` from a JSON error body; fall back to status text.
    let detail = response.statusText || `Request failed (status ${response.status})`;
    try {
      const body = await response.json();
      if (body && typeof body.detail === 'string') detail = body.detail;
    } catch {
      /* non-JSON error body — keep the fallback detail */
    }
    throw new ApiError(response.status, detail);
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (response.status === 204) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export const api = {
  /** GET /todos -> Todo[] */
  listTodos() {
    return request('/todos');
  },

  /** GET /todos/{id} -> Todo (404 -> ApiError) */
  getTodo(id) {
    return request(`/todos/${id}`);
  },

  /** POST /todos -> created Todo */
  createTodo({ title, description }) {
    return request('/todos', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  },

  /** PUT /todos/{id} -> updated Todo. `patch` may include title/description/completed. */
  updateTodo(id, patch) {
    return request(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  /** DELETE /todos/{id} -> void (204 No Content) */
  async deleteTodo(id) {
    await request(`/todos/${id}`, { method: 'DELETE' });
  },

  /** POST /agent/chat -> {reply, tool_activity, todos_changed} */
  chat(messages) {
    return request('/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  },
};
