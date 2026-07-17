// src/api/client.js

import { API_BASE_URL } from "../config/env";

/**
 * Builds a full API URL from a relative path.
 *
 * Example:
 * apiUrl("/runs")
 * -> http://localhost:8000/runs
 */
export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

/**
 * Shared request helper.
 *
 * All API modules should use this instead of calling
 * fetch() directly.
 */
export async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), options);

  if (!response.ok) {
    const message = `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}