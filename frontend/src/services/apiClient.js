/**
 * Centralized API Client — GrowWise AI
 * Configures base URL from VITE_API_BASE_URL or defaults to http://127.0.0.1:8000.
 * Handles unified JSON request formatting and detailed error extraction.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '');

/**
 * Universal request wrapper for FastAPI backend
 * @param {string} endpoint - API path (e.g. '/api/plants')
 * @param {RequestInit} options - Standard fetch options
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = { ...options.headers };
  // Only add Content-Type: application/json if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(`Unable to reach backend at ${API_BASE_URL}. Please ensure FastAPI is running.`);
  }

  if (!response.ok) {
    let errorDetail = `Request failed with HTTP status ${response.status}`;
    try {
      const errJson = await response.json();
      if (typeof errJson?.detail === 'string') {
        errorDetail = errJson.detail;
      } else if (Array.isArray(errJson?.detail)) {
        errorDetail = errJson.detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
      } else if (errJson?.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // Non-JSON error body fallback
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}
