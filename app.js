/**
 * app.js — Main application controller
 * Wires together API, UI, and user interactions
 */

import { fetchProfile } from './api.js';
import {
  showLoading, hideLoading,
  showError, hideError,
  setSearchLoading, showSearchError,
  renderHistory, hideHistory,
  renderProfile, renderLangAnalytics,
  renderRepoStats, renderRepos,
  renderCompare, hideCompareView,
  showRateLimitToast, showProfileSection, hideProfileSection,
} from './ui.js';
import {
  getHistory, addToHistory, clearHistory,
  getSavedTheme, saveTheme,
  debounce,
} from './utils.js';

// ── App State ──────────────────────────────────────────────────────────────

const state = {
  user1: null,
  repos1: null,
  user2: null,
  repos2: null,
  sortMethod: 'updated',
  compareMode: false,
  lastSearch: '',
};

// ── DOM References ─────────────────────────────────────────────────────────

const searchInput   = document.getElementById('searchInput');
const searchBtn     = document.getElementById('searchBtn');
const themeToggle   = document.getElementById('themeToggle');
const sortSelect    = document.getElementById('sortSelect');
const clearHistBtn  = document.getElementById('clearHistory');
const btnRetry      = document.getElementById('btnRetry');
const btnToggleCompare = document.getElementById('btnToggleCompare');
const compareBanner = document.getElementById('compareBanner');
const cancelCompare = document.getElementById('cancelCompare');

// ── Theme ──────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── Search History ─────────────────────────────────────────────────────────

function refreshHistory() {
  const history = getHistory();
  renderHistory(history, (username) => {
    searchInput.value = username;
    hideHistory();
    doSearch(username);
  });
}

// ── Core Search ────────────────────────────────────────────────────────────

async function doSearch(username) {
  const trimmed = username.trim();
  if (!trimmed) {
    showSearchError('Please enter a GitHub username.');
    searchInput.focus();
    return;
  }

  state.lastSearch = trimmed;
  hideHistory();
  setSearchLoading(true);
  showLoading();
  hideError();

  try {
    const { user, repos } = await fetchProfile(trimmed);

    if (state.compareMode && state.user1) {
      // Second search: compare mode
      state.user2 = user;
      state.repos2 = repos;

      // Render compare
      renderCompare(state.user1, state.repos1, state.user2, state.repos2);

      // Hide single-profile analytics, show compare
      document.getElementById('analyticsRow').style.display = 'none';
      document.getElementById('profileHeader').innerHTML = '';
      document.getElementById('reposGrid').innerHTML = '';
      document.getElementById('repoCountBadge').textContent = '0';
      document.querySelector('.repos-section').style.display = 'none';

      // Exit compare mode after success
      state.compareMode = false;
      compareBanner.classList.add('hidden');
      btnToggleCompare.classList.remove('active');
    } else {
      // Normal single-user view
      state.user1 = user;
      state.repos1 = repos;
      state.user2 = null;
      state.repos2 = null;

      // Reset compare view
      hideCompareView();
      document.getElementById('analyticsRow').style.display = '';
      document.querySelector('.repos-section').style.display = '';

      renderProfile(user);
      renderLangAnalytics(repos);
      renderRepoStats(user, repos);
      renderRepos(repos, state.sortMethod);
    }

    showProfileSection();
    addToHistory(trimmed);
    refreshHistory();

    // Smooth scroll to profile
    setTimeout(() => {
      document.getElementById('profileSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

  } catch (err) {
    hideProfileSection();

    if (err.type === 'rate_limit') {
      showError('Rate Limit Exceeded', err.message);
      showRateLimitToast(err.resetTime);
    } else if (err.type === 'not_found') {
      showError('User Not Found', err.message);
    } else if (!navigator.onLine) {
      showError('No Internet Connection', 'Check your connection and try again.');
    } else {
      showError('Something Went Wrong', err.message || 'An unexpected error occurred.');
    }

    // Reset compare mode on error
    if (state.compareMode) {
      state.compareMode = false;
      compareBanner.classList.add('hidden');
      btnToggleCompare.classList.remove('active');
    }
  } finally {
    hideLoading();
    setSearchLoading(false);
  }
}

// ── Sort ───────────────────────────────────────────────────────────────────

function handleSort(method) {
  state.sortMethod = method;
  if (state.repos1) {
    renderRepos(state.repos1, method);
  }
}

// ── Compare Mode ───────────────────────────────────────────────────────────

function enterCompareMode() {
  if (!state.user1) {
    showSearchError('Search for a user first before comparing.');
    return;
  }
  state.compareMode = true;
  compareBanner.classList.remove('hidden');
  btnToggleCompare.classList.add('active');
  searchInput.value = '';
  searchInput.focus();
}

function exitCompareMode() {
  state.compareMode = false;
  state.user2 = null;
  state.repos2 = null;
  compareBanner.classList.add('hidden');
  btnToggleCompare.classList.remove('active');
  hideCompareView();

  if (state.user1) {
    document.getElementById('analyticsRow').style.display = '';
    document.querySelector('.repos-section').style.display = '';
    renderProfile(state.user1);
    renderLangAnalytics(state.repos1);
    renderRepoStats(state.user1, state.repos1);
    renderRepos(state.repos1, state.sortMethod);
    showProfileSection();
  }
}

// ── Event Listeners ────────────────────────────────────────────────────────

// Search button
searchBtn.addEventListener('click', () => doSearch(searchInput.value));

// Enter key in search
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch(searchInput.value);
  if (e.key === 'Escape') hideHistory();
});

// Show history when input is focused (if has content)
searchInput.addEventListener('focus', () => {
  const history = getHistory();
  if (history.length) refreshHistory();
});

// Close history when clicking outside
document.addEventListener('click', e => {
  if (!document.getElementById('searchContainer').contains(e.target)) {
    hideHistory();
  }
});

// Sort dropdown
sortSelect.addEventListener('change', () => handleSort(sortSelect.value));

// Clear history
clearHistBtn.addEventListener('click', () => {
  clearHistory();
  hideHistory();
});

// Theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Retry button
btnRetry.addEventListener('click', () => {
  if (state.lastSearch) doSearch(state.lastSearch);
  else showError('', '');
});

// Compare mode
btnToggleCompare.addEventListener('click', () => {
  if (state.compareMode) exitCompareMode();
  else enterCompareMode();
});

cancelCompare.addEventListener('click', exitCompareMode);

// Keyboard shortcut: Cmd/Ctrl+K to focus search
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  // Apply saved theme
  applyTheme(getSavedTheme());

  // Load history
  refreshHistory();

  // Auto-search from URL query param
  const urlParams = new URLSearchParams(window.location.search);
  const urlUser = urlParams.get('user');
  if (urlUser) {
    searchInput.value = urlUser;
    doSearch(urlUser);
  }

  // Focus search input
  searchInput.focus();
}

init();
