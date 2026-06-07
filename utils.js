/**
 * utils.js — Helper utilities for DevScope
 */

/**
 * Format a number with K/M suffix for compact display
 */
export function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n ?? 0);
}

/**
 * Format ISO date string to relative or formatted date
 */
export function formatDate(iso) {
  if (!iso) return 'Unknown';
  const date = new Date(iso);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format join date (GitHub account created_at)
 */
export function formatJoinDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

/**
 * Format reset time from Unix timestamp
 */
export function formatResetTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Sanitize text for safe HTML insertion
 */
export function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Debounce function — prevents rapid firing
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Language color palette (GitHub's official language colors)
 */
export const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python:     '#3572A5',
  Java:       '#b07219',
  Ruby:       '#701516',
  Go:         '#00ADD8',
  Rust:       '#dea584',
  C:          '#555555',
  'C++':      '#f34b7d',
  'C#':       '#178600',
  PHP:        '#4F5D95',
  HTML:       '#e34c26',
  CSS:        '#563d7c',
  Shell:      '#89e051',
  Kotlin:     '#A97BFF',
  Swift:      '#F05138',
  Dart:       '#00B4AB',
  Scala:      '#c22d40',
  Vue:        '#41b883',
  R:          '#198CE7',
  MATLAB:     '#e16737',
  Perl:       '#0298c3',
  Lua:        '#000080',
  Haskell:    '#5e5086',
  Elixir:     '#6e4a7e',
  Clojure:    '#db5855',
  Jupyter:    '#DA5B0B',
  'Jupyter Notebook': '#DA5B0B',
  PowerShell: '#012456',
  Makefile:   '#427819',
  Dockerfile: '#384d54',
  default:    '#8b949e',
};

export function getLangColor(lang) {
  return LANG_COLORS[lang] || LANG_COLORS.default;
}

/**
 * Generate chart color palette with transparency
 */
export function getChartColors(langs) {
  return langs.map(l => getLangColor(l));
}

/**
 * localStorage helpers
 */
const HISTORY_KEY = 'devscope_history';

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export function addToHistory(username) {
  let history = getHistory();
  history = history.filter(u => u.toLowerCase() !== username.toLowerCase());
  history.unshift(username);
  history = history.slice(0, 5);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

/**
 * Theme helpers
 */
const THEME_KEY = 'devscope_theme';

export function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Sort repositories array
 */
export function sortRepos(repos, method) {
  const sorted = [...repos];
  switch (method) {
    case 'stars':
      return sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'forks':
      return sorted.sort((a, b) => b.forks_count - a.forks_count);
    case 'updated':
    default:
      return sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
}

/**
 * Aggregate language counts from repos array
 * Returns array of {name, count, pct} sorted by count desc
 */
export function aggregateLangs(repos) {
  const map = {};
  for (const r of repos) {
    if (r.language) {
      map[r.language] = (map[r.language] || 0) + 1;
    }
  }
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  return Object.entries(map)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate total stars across all repos
 */
export function totalStars(repos) {
  return repos.reduce((sum, r) => sum + r.stargazers_count, 0);
}

/**
 * Calculate total forks across all repos
 */
export function totalForks(repos) {
  return repos.reduce((sum, r) => sum + r.forks_count, 0);
}
