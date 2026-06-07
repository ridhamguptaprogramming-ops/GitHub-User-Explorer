import { formatResetTime } from './utils.js';

const BASE = 'https://api.github.com';

async function ghFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/vnd.github.v3+json' }
  });

  const remaining = Number(res.headers.get('X-RateLimit-Remaining'));
  const reset = Number(res.headers.get('X-RateLimit-Reset'));

  if (res.status === 403 && remaining === 0) {
    const err = new Error(`GitHub API rate limit exceeded. Try again after ${formatResetTime(reset)}.`);
    err.type = 'rate_limit';
    err.resetTime = formatResetTime(reset);
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

  return res.json();
}

export async function fetchUser(username) {
  return ghFetch(`/users/${encodeURIComponent(username)}`);
}

export async function fetchRepos(username) {
  return ghFetch(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`);
}

export async function fetchFollowers(username) {
  return ghFetch(`/users/${encodeURIComponent(username)}/followers?per_page=30`);
}

export async function fetchFollowing(username) {
  return ghFetch(`/users/${encodeURIComponent(username)}/following?per_page=30`);
}

export async function fetchProfile(username) {
  const [user, repos, followers, following] = await Promise.all([
    fetchUser(username),
    fetchRepos(username),
    fetchFollowers(username),
    fetchFollowing(username),
  ]);
  return { user, repos, followers, following };
}

export async function checkRateLimit() {
  try {
    const res = await fetch(`${BASE}/rate_limit`, { headers: { Accept: 'application/vnd.github.v3+json' } });
    const data = await res.json();
    return data.rate;
  } catch {
    return null;
  }
}
