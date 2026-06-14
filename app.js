import { fetchProfile } from './api.js';
import {
  showLoading, hideLoading, showError, hideError, setSearchLoading, showSearchError,
  renderHistory, hideHistory, renderProfile, renderLangAnalytics, renderRepoStats,
  renderRepos, renderCompare, showRateLimitToast, showProfileSection, hideProfileSection,
  renderProfileSummary, renderDevScore, updateBookmarkButton, renderAchievementBadges,
  renderRepoInsights, renderActivityInsights, renderTrending, renderHeatmap,
  renderFollowers, renderFavorites,
} from './ui.js';
import { startHumanTyping, startPlaceholderTyping } from './ui.js';
import {
  escHtml, getHistory, addToHistory, clearHistory, getSavedTheme, saveTheme, debounce,
  getFavorites, saveFavorites, toggleFavorite, isFavorite, getLanguageOptions, filterRepos, computeDevScore,
  buildProfileSummary, getActivitySets, getRepoInsights, getAchievementBadges, downloadFile,
} from './utils.js';

const state = {
  user1: null,
  repos1: null,
  followers: [],
  following: [],
  favorites: getFavorites(),
  filteredRepos: [],
  sortMethod: 'updated',
  compareMode: false,
  lastSearch: '',
  repoSearch: '',
  repoLanguage: 'all',
  repoStarFilter: 'any',
};

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const themeToggle = document.getElementById('themeToggle');
const sortSelect = document.getElementById('sortSelect');
const clearHistBtn = document.getElementById('clearHistory');
const btnRetry = document.getElementById('btnRetry');
const btnToggleCompare = document.getElementById('btnToggleCompare');
const compareBanner = document.getElementById('compareBanner');
const cancelCompare = document.getElementById('cancelCompare');
const repoSearchInput = document.getElementById('repoSearchInput');
const languageFilter = document.getElementById('languageFilter');
const starFilter = document.getElementById('starFilter');
const toggleBookmarkBtn = document.getElementById('toggleBookmarkBtn');
const exportSummaryBtn = document.getElementById('exportSummaryBtn');
const exportReportBtn = document.getElementById('exportReportBtn');
const repoCountBadge = document.getElementById('repoCountBadge');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveTheme(theme);
}

function refreshHistory() {
  const history = getHistory();
  renderHistory(history, username => {
    searchInput.value = username;
    hideHistory();
    doSearch(username);
  });
}

function refreshFavorites() {
  state.favorites = getFavorites();
  const onView = username => {
    searchInput.value = username;
    doSearch(username);
  };
  const onRemove = username => {
    state.favorites = state.favorites.filter(item => item.login.toLowerCase() !== username.toLowerCase());
    saveFavorites(state.favorites);
    refreshFavorites();
    if (state.user1) updateBookmarkButton(isFavorite(state.user1.login));
  };
  renderFavorites(state.favorites, onView, onRemove);
}

function updateFilters(repos) {
  const languages = getLanguageOptions(repos);
  languageFilter.innerHTML = '<option value="all">All languages</option>' + languages.map(lang => `<option value="${escHtml(lang)}">${escHtml(lang)}</option>`).join('');
}

function applyRepoFilters() {
  state.filteredRepos = filterRepos(state.repos1 || [], state.repoSearch, state.repoLanguage, state.repoStarFilter);
  renderRepos(state.filteredRepos, state.sortMethod);
}

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
    const { user, repos, followers, following } = await fetchProfile(trimmed);

    if (state.compareMode && state.user1) {
      state.user2 = user;
      state.repos2 = repos;
      renderCompare(state.user1, state.repos1, state.user2, state.repos2);
      document.getElementById('analyticsRow').style.display = 'none';
      document.getElementById('reposSection').style.display = 'none';
      state.compareMode = false;
      compareBanner.classList.add('hidden');
      btnToggleCompare.classList.remove('active');
    } else {
      state.user1 = user;
      state.repos1 = repos;
      state.followers = followers;
      state.following = following;
      state.filteredRepos = repos;
      state.compareMode = false;
      renderProfile(user, isFavorite(user.login));
      const devScore = computeDevScore(user, repos);
      renderDevScore(devScore.score);
      renderProfileSummary(buildProfileSummary(user, repos, followers, following));
      renderAchievementBadges(getAchievementBadges(user, repos));
      renderRepoInsights(getRepoInsights(repos));
      renderActivityInsights(getActivitySets(repos));
      renderTrending(repos);
      renderLangAnalytics(repos);
      renderRepoStats(user, repos);
      renderHeatmap(repos);
      renderFollowers(followers, following);
      renderFavorites(state.favorites, user => doSearch(user), username => {
        state.favorites = state.favorites.filter(item => item.login.toLowerCase() !== username.toLowerCase());
        saveFavorites(state.favorites);
        refreshFavorites();
        if (state.user1) updateBookmarkButton(isFavorite(state.user1.login));
      });
      updateFilters(repos);
      applyRepoFilters();
      document.getElementById('analyticsRow').style.display = '';
      document.getElementById('reposSection').style.display = '';
    }

    showProfileSection();
    addToHistory(trimmed);
    refreshHistory();
    setTimeout(() => document.getElementById('profileSection').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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

function handleSort(method) {
  state.sortMethod = method;
  applyRepoFilters();
}

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
  compareBanner.classList.add('hidden');
  btnToggleCompare.classList.remove('active');
  document.getElementById('analyticsRow').style.display = '';
  document.getElementById('reposSection').style.display = '';
  if (state.user1) {
    renderProfile(state.user1, isFavorite(state.user1.login));
    renderLangAnalytics(state.repos1);
    renderRepoStats(state.user1, state.repos1);
    renderRepos(state.filteredRepos, state.sortMethod);
    showProfileSection();
  }
}

function exportSummary() {
  if (!state.user1) return;
  const content = buildProfileSummary(state.user1, state.repos1, state.followers, state.following);
  downloadFile(`${state.user1.login}-summary.txt`, content);
}

function exportReport() {
  if (!state.user1) return;
  const payload = {
    profile: state.user1,
    repositoryInsights: getRepoInsights(state.repos1),
    activity: getActivitySets(state.repos1),
    followers: state.followers.slice(0, 10),
    following: state.following.slice(0, 10),
  };
  downloadFile(`${state.user1.login}-report.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function debounceUpdate() {
  state.repoSearch = repoSearchInput.value;
  state.repoLanguage = languageFilter.value;
  state.repoStarFilter = starFilter.value;
  applyRepoFilters();
}

function init() {
  applyTheme(getSavedTheme());
  refreshHistory();
  refreshFavorites();
  const urlUser = new URLSearchParams(window.location.search).get('user');
  if (urlUser) {
    searchInput.value = urlUser;
    doSearch(urlUser);
  }
  searchInput.focus();

  // Start human-like typing on hero subtitle and search placeholder
  try {
    const heroEl = document.getElementById('heroSub');
    const heroStrings = heroEl?.dataset?.strings ? heroEl.dataset.strings.split('|').map(s => s.trim()).filter(Boolean) : [];
    if (heroStrings.length) startHumanTyping(heroEl, heroStrings, { minDelay: 28, maxDelay: 120, mistakeChance: 0.05, pauseBetween: 1800, loop: true });
    startPlaceholderTyping(searchInput, ['octocat', 'torvalds', 'gaearon', 'sindresorhus', 'nodejs'], { minDelay: 25, maxDelay: 110, mistakeChance: 0.02, pauseBetween: 2400, loop: true });
  } catch (e) { /* non-fatal */ }
}

searchBtn.addEventListener('click', () => doSearch(searchInput.value));
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(searchInput.value); if (e.key === 'Escape') hideHistory(); });
searchInput.addEventListener('focus', () => { if (getHistory().length) refreshHistory(); });
document.addEventListener('click', e => { if (!document.getElementById('searchContainer').contains(e.target)) hideHistory(); });
sortSelect.addEventListener('change', () => handleSort(sortSelect.value));
clearHistBtn.addEventListener('click', () => { clearHistory(); hideHistory(); });
repoSearchInput.addEventListener('input', debounce(() => debounceUpdate(), 180));
languageFilter.addEventListener('change', debounceUpdate);
starFilter.addEventListener('change', debounceUpdate);
toggleBookmarkBtn.addEventListener('click', () => {
  if (!state.user1) return;
  state.favorites = toggleFavorite(state.user1);
  refreshFavorites();
  updateBookmarkButton(isFavorite(state.user1.login));
});
exportSummaryBtn.addEventListener('click', exportSummary);
exportReportBtn.addEventListener('click', exportReport);
themeToggle.addEventListener('click', () => { const current = document.documentElement.getAttribute('data-theme'); applyTheme(current === 'dark' ? 'light' : 'dark'); });
btnRetry.addEventListener('click', () => { if (state.lastSearch) doSearch(state.lastSearch); });
btnToggleCompare.addEventListener('click', () => state.compareMode ? exitCompareMode() : enterCompareMode());
cancelCompare.addEventListener('click', exitCompareMode);
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchInput.focus(); searchInput.select(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
init();
