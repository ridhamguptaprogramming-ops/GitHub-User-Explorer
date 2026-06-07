export function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n || 0);
}

export function formatDate(iso) {
  if (!iso) return 'Unknown';
  const date = new Date(iso);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatJoinDate(iso) {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

export function formatResetTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', Ruby: '#701516', Go: '#00ADD8', Rust: '#dea584',
  C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', PHP: '#4F5D95', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Kotlin: '#A97BFF',
  Swift: '#F05138', Dart: '#00B4AB', Scala: '#c22d40', Vue: '#41b883', R: '#198CE7', MATLAB: '#e16737', Lua: '#000080', Haskell: '#5e5086',
  Elixir: '#6e4a7e', Clojure: '#db5855', 'Jupyter Notebook': '#DA5B0B', PowerShell: '#012456', Makefile: '#427819', Dockerfile: '#384d54', default: '#8b949e',
};

export function getLangColor(lang) {
  return LANG_COLORS[lang] || LANG_COLORS.default;
}

export function getChartColors(labels = []) {
  return labels.map((label, index) => {
    const color = LANG_COLORS[label] || LANG_COLORS.default;
    if (!color || index === 0) return color;
    return color;
  });
}

const HISTORY_KEY = 'devscope_history';
const THEME_KEY = 'devscope_theme';
const FAVORITES_KEY = 'devscope_favorites';

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}

export function addToHistory(username) {
  let list = getHistory();
  list = list.filter(item => item.toLowerCase() !== username.toLowerCase());
  list.unshift(username);
  list = list.slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function getSavedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch { return []; }
}

export function saveFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

export function toggleFavorite(user) {
  const current = getFavorites();
  const exists = current.find(item => item.login.toLowerCase() === user.login.toLowerCase());
  if (exists) {
    const updated = current.filter(item => item.login.toLowerCase() !== user.login.toLowerCase());
    saveFavorites(updated);
    return updated;
  }
  const next = [ { login: user.login, avatar_url: user.avatar_url, name: user.name, html_url: user.html_url }, ...current ];
  saveFavorites(next);
  return next.slice(0, 10);
}

export function isFavorite(login) {
  return getFavorites().some(item => item.login.toLowerCase() === login.toLowerCase());
}

export function sortRepos(repos, method) {
  const list = [...repos];
  switch (method) {
    case 'stars': return list.sort((a, b) => b.stargazers_count - a.stargazers_count);
    case 'name': return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'forks': return list.sort((a, b) => b.forks_count - a.forks_count);
    default: return list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
}

export function aggregateLangs(repos) {
  const map = {};
  for (const repo of repos) {
    if (repo.language) map[repo.language] = (map[repo.language] || 0) + 1;
  }
  const total = Object.values(map).reduce((acc, value) => acc + value, 0) || 1;
  return Object.entries(map)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export function totalStars(repos) {
  return repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
}

export function totalForks(repos) {
  return repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
}

export function getLanguageOptions(repos) {
  const langs = new Set(repos.map(repo => repo.language).filter(Boolean));
  return [...langs].sort((a, b) => a.localeCompare(b));
}

export function filterRepos(repos, query, language, starFilter) {
  const normalized = String(query || '').trim().toLowerCase();
  return repos.filter(repo => {
    const matchText = !normalized || repo.name.toLowerCase().includes(normalized) || (repo.description || '').toLowerCase().includes(normalized);
    const matchLang = language === 'all' || repo.language === language;
    let matchStars = true;
    const stars = repo.stargazers_count || 0;
    if (starFilter === '100') matchStars = stars >= 100;
    if (starFilter === '50') matchStars = stars >= 50;
    if (starFilter === '20') matchStars = stars >= 20;
    if (starFilter === '10') matchStars = stars >= 10;
    return matchText && matchLang && matchStars;
  });
}

export function computeDevScore(user, repos) {
  const stars = totalStars(repos);
  const forks = totalForks(repos);
  const activeRepos = repos.filter(repo => {
    const age = (Date.now() - new Date(repo.updated_at).getTime()) / 86400000;
    return age < 120;
  }).length;
  const createdRecently = repos.filter(repo => {
    const age = (Date.now() - new Date(repo.created_at).getTime()) / 86400000;
    return age < 90;
  }).length;
  const score = Math.min(100,
    Math.round(
      Math.min(20, user.public_repos * 1.4) +
      Math.min(30, stars / 12) +
      Math.min(20, user.followers / 4) +
      Math.min(15, forks / 8) +
      Math.min(15, activeRepos * 1.4 + createdRecently * 0.8)
    )
  );
  return { score, stars, forks, activeRepos, createdRecently };
}

export function buildProfileSummary(user, repos, followers, following) {
  const langList = aggregateLangs(repos).slice(0, 3).map(item => item.name);
  const topLang = langList[0] || 'Unknown';
  const starCount = totalStars(repos);
  const repoCount = repos.length;
  const followerCount = user.followers;
  const trending = repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 2).map(r => r.name).join(' and ') || 'their top projects';
  return `This developer primarily works with ${topLang}${langList[1] ? ' and ' + langList[1] : ''}, maintains ${repoCount} repos, and has ${formatNumber(starCount)} stars across their portfolio. They show strong open-source momentum with ${formatNumber(followerCount)} followers and active contributions through ${trending}.`;
}

export function getRepoInsights(repos) {
  const stars = totalStars(repos);
  const forks = totalForks(repos);
  const avgStars = repos.length ? Math.round(stars / repos.length) : 0;
  const sortedByStars = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
  const sortedByForks = [...repos].sort((a, b) => b.forks_count - a.forks_count);
  return {
    totalStars: stars,
    totalForks: forks,
    avgStars,
    mostStarred: sortedByStars[0] || null,
    mostForked: sortedByForks[0] || null,
  };
}

export function getActivitySets(repos) {
  const byUpdated = [...repos].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 3);
  const byCreated = [...repos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
  const byPushed = [...repos].sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)).slice(0, 3);
  return { byUpdated, byCreated, byPushed };
}

export function getHealthStatus(repo) {
  const updatedDays = Math.max(0, Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / 86400000));
  const score = (repo.stargazers_count || 0) * 0.7 + (repo.forks_count || 0) * 0.8 - (repo.open_issues_count || 0) * 0.4;
  if (updatedDays <= 90 && score >= 40) return { label: 'Healthy', modifier: 'healthy' };
  if (updatedDays <= 180 && score >= 15) return { label: 'Moderate', modifier: 'moderate' };
  return { label: 'Inactive', modifier: 'inactive' };
}

export function generateHeatmapData(repos, weeks = 12) {
  const days = weeks * 7;
  const counts = Array.from({ length: days }, () => 0);
  const now = Date.now();
  repos.forEach(repo => {
    ['created_at', 'pushed_at', 'updated_at'].forEach(key => {
      if (!repo[key]) return;
      const date = new Date(repo[key]).getTime();
      const deltaDays = Math.floor((now - date) / 86400000);
      if (deltaDays >= 0 && deltaDays < days) {
        counts[days - deltaDays - 1] += 1;
      }
    });
    const bonus = Math.min(3, Math.floor((repo.stargazers_count || 0) / 50));
    if (repo.pushed_at) {
      const date = new Date(repo.pushed_at).getTime();
      const deltaDays = Math.floor((now - date) / 86400000);
      if (deltaDays >= 0 && deltaDays < days) counts[days - deltaDays - 1] += bonus;
    }
  });
  const max = Math.max(...counts, 1);
  return counts.map(value => Math.min(4, Math.floor((value / max) * 4)));
}

export function getAchievementBadges(user, repos) {
  const stars = totalStars(repos);
  const forks = totalForks(repos);
  const activeRepos = repos.filter(repo => (Date.now() - new Date(repo.updated_at).getTime()) / 86400000 < 120).length;
  const badges = [];
  if (stars >= 300) badges.push('⭐ Star Collector');
  if (forks >= 120 || stars >= 600) badges.push('🚀 Open Source Contributor');
  if (activeRepos >= 8) badges.push('💻 Full Stack Developer');
  if (user.public_repos >= 25 && user.followers >= 120) badges.push('🔥 Rising Developer');
  if (user.followers >= 300) badges.push('🏆 Community Favorite');
  if (!badges.length) badges.push('🌱 Emerging Developer');
  return badges.slice(0, 5);
}

export function getTopRepos(repos, count = 3) {
  const trending = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, count);
  const recent = [...repos].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, count);
  return { trending, recent };
}

export function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
