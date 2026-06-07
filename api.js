/**
 * api.js — GitHub REST API layer
 * Handles fetching, rate limits, and error normalization
 */

import { formatResetTime } from './utils.js';

const BASE = 'https://api.github.com';

/**
 * Core fetch wrapper — reads rate limit headers, throws structured errors
 */
async function ghFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/vnd.github.v3+json' }
  });

  // Check rate limit
  const remaining = Number(res.headers.get('X-RateLimit-Remaining'));
  const reset = Number(res.headers.get('X-RateLimit-Reset'));

  if (res.status === 403 && remaining === 0) {
    const resetTime = formatResetTime(reset);
    const err = new Error(`GitHub API rate limit exceeded. Try again after ${resetTime}.`);
    err.type = 'rate_limit';
    err.resetTime = resetTime;
    throw err;
  }

  if (res.status === 404) {
    const err = new Error('User not found. Please check the username and try again.');
    err.type = 'not_found';
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    err.type = 'api_error';
    throw err;
  }

  // Expose rate limit info on successful response
  const data = await res.json();
  data._rateRemaining = remaining;
  data._rateReset = reset;
  return data;
}

/**
 * Fetch user profile data
 */
export async function fetchUser(username) {
  return ghFetch(`/users/${encodeURIComponent(username)}`);
}

/**
 * Fetch user repositories (up to 100, sorted by most recently updated)
 */
export async function fetchRepos(username) {
  return ghFetch(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`);
}

/**
 * Fetch both user and repos concurrently
 * Returns { user, repos } or throws
 */
export async function fetchProfile(username) {
  const [user, repos] = await Promise.all([
    fetchUser(username),
    fetchRepos(username),
  ]);
  return { user, repos };
}

/**
 * Check current rate limit status without counting against limit
 */
export async function checkRateLimit() {
  try {
    const res = await fetch(`${BASE}/rate_limit`, {
      headers: { Accept: 'application/vnd.github.v3+json' }
    });
    const data = await res.json();
    return data.rate;
  } catch {
    return null;
  }
}
