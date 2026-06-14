
(function () {
  'use strict';

  function formatNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n ?? 0);
  }

  function formatDate(iso) {
    if (!iso) return 'Unknown';
    const date = new Date(iso);
    const now = new Date();
    const days = Math.floor((now - date) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  function formatJoinDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  function formatResetTime(ts) {
    return new Date(ts * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function debounce(fn, ms = 300) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Java: '#b07219', Ruby: '#701516', Go: '#00ADD8', Rust: '#dea584',
    C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', PHP: '#4F5D95',
    HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Kotlin: '#A97BFF',
    Swift: '#F05138', Dart: '#00B4AB', Scala: '#c22d40', Vue: '#41b883',
    R: '#198CE7', MATLAB: '#e16737', Lua: '#000080', Haskell: '#5e5086',
    Elixir: '#6e4a7e', Clojure: '#db5855', 'Jupyter Notebook': '#DA5B0B',
    PowerShell: '#012456', Makefile: '#427819', Dockerfile: '#384d54',
    default: '#8b949e',
  };

  function getLangColor(lang) {
    return LANG_COLORS[lang] || LANG_COLORS.default;
  }

  const HISTORY_KEY = 'devscope_history';
  const THEME_KEY   = 'devscope_theme';

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
  }

  function addToHistory(u) {
    let h = getHistory().filter(x => x.toLowerCase() !== u.toLowerCase());
    h.unshift(u);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 5)));
  }

  function clearHistoryStore() { localStorage.removeItem(HISTORY_KEY); }
  function getSavedTheme()     { return localStorage.getItem(THEME_KEY) || 'dark'; }
  function saveTheme(t)        { localStorage.setItem(THEME_KEY, t); }

  function sortRepos(repos, method) {
    const s = [...repos];
    switch (method) {
      case 'stars':   return s.sort((a, b) => b.stargazers_count - a.stargazers_count);
      case 'name':    return s.sort((a, b) => a.name.localeCompare(b.name));
      case 'forks':   return s.sort((a, b) => b.forks_count - a.forks_count);
      default:        return s.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }
  }

  function aggregateLangs(repos) {
    const map = {};
    for (const r of repos) if (r.language) map[r.language] = (map[r.language] || 0) + 1;
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }

  function totalStars(repos) { return repos.reduce((s, r) => s + (r.stargazers_count || 0), 0); }
  function totalForks(repos) { return repos.reduce((s, r) => s + (r.forks_count || 0), 0); }

/* APP */

  const BASE = 'https://api.github.com';

  async function ghFetch(path) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/vnd.github.v3+json' }
    });

    const remaining = Number(res.headers.get('X-RateLimit-Remaining'));
    const reset     = Number(res.headers.get('X-RateLimit-Reset'));

    if (res.status === 403 && remaining === 0) {
      const rt = formatResetTime(reset);
      const e = new Error(`GitHub API rate limit exceeded. Resets at ${rt}.`);
      e.type = 'rate_limit'; e.resetTime = rt;
      throw e;
    }
    if (res.status === 404) {
      const e = new Error('User not found. Check the username and try again.');
      e.type = 'not_found'; throw e;
    }
    if (!res.ok) {
      const e = new Error(`GitHub API error ${res.status}: ${res.statusText}`);
      e.type = 'api_error'; throw e;
    }
    return res.json();
  }

  async function fetchProfile(username) {
    const enc = encodeURIComponent(username);
    const [user, repos] = await Promise.all([
      ghFetch(`/users/${enc}`),
      ghFetch(`/users/${enc}/repos?per_page=100&sort=updated`),
    ]);
    return { user, repos };
  }

  /* UI State */
  let langChartInstance = null;

  /* Loading  */
  function showLoading() {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
  }

  function hideLoading() {
    document.getElementById('loadingState').classList.add('hidden');
  }

  /* Error */
  function showError(title, message) {
    hideLoading();
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMsg').textContent = message;
    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('profileSection').classList.add('hidden');
  }

  /* Search state */
  function setSearchLoading(loading) {
    const btn     = document.getElementById('searchBtn');
    const spinner = btn.querySelector('.btn-spinner');
    const text    = btn.querySelector('.btn-text');
    const input   = document.getElementById('searchInput');
    if (loading) {
      spinner.classList.remove('hidden');
      text.classList.add('hidden');
      btn.disabled = true; input.disabled = true;
    } else {
      spinner.classList.add('hidden');
      text.classList.remove('hidden');
      btn.disabled = false; input.disabled = false;
    }
  }

  function showSearchError(msg) {
    const el = document.getElementById('searchError');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  }

  /* History */
  function renderHistory(history, onSelect) {
    const container = document.getElementById('searchHistory');
    const list      = document.getElementById('historyList');
    if (!history.length) { container.classList.add('hidden'); return; }
    list.innerHTML = history.map(u => `
      <div class="history-item" data-user="${escHtml(u)}" tabindex="0" role="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        ${escHtml(u)}
      </div>`).join('');
    list.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => onSelect(item.dataset.user));
      item.addEventListener('keydown', e => e.key === 'Enter' && onSelect(item.dataset.user));
    });
    container.classList.remove('hidden');
  }

  function hideHistory() {
    document.getElementById('searchHistory').classList.add('hidden');
  }

  /* Profile Header */
  function renderProfile(user) {
    const el = document.getElementById('profileHeader');
    const meta = [
      user.location ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${escHtml(user.location)}</span>` : '',
      user.company  ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>${escHtml(user.company.replace('@',''))}</span>` : '',
      user.blog     ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg><a href="${user.blog.startsWith('http')?escHtml(user.blog):'https://'+escHtml(user.blog)}" target="_blank" rel="noopener">${escHtml(user.blog)}</a></span>` : '',
      user.created_at ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Joined ${formatJoinDate(user.created_at)}</span>` : '',
      user.twitter_username ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/></svg>@${escHtml(user.twitter_username)}</span>` : '',
    ].filter(Boolean).join('');

    el.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar-wrap">
          <img class="profile-avatar" src="${escHtml(user.avatar_url)}&s=240"
               alt="${escHtml(user.login)}" loading="lazy"/>
        </div>
        <div class="profile-details">
          <div class="profile-name">${escHtml(user.name || user.login)}</div>
          <div class="profile-login">@${escHtml(user.login)}</div>
          ${user.bio ? `<div class="profile-bio">${escHtml(user.bio)}</div>` : ''}
          ${meta ? `<div class="profile-meta">${meta}</div>` : ''}
          <div class="profile-stats">
            <div class="stat-pill">
              <span class="stat-pill-val">${formatNumber(user.followers)}</span>
              <span class="stat-pill-label">Followers</span>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-val">${formatNumber(user.following)}</span>
              <span class="stat-pill-label">Following</span>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-val">${formatNumber(user.public_repos)}</span>
              <span class="stat-pill-label">Repos</span>
            </div>
            ${user.public_gists > 0 ? `<div class="stat-pill"><span class="stat-pill-val">${formatNumber(user.public_gists)}</span><span class="stat-pill-label">Gists</span></div>` : ''}
          </div>
          <div class="profile-actions">
            <a class="btn-github" href="${escHtml(user.html_url)}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              View on GitHub
            </a>
          </div>
        </div>
      </div>`;
  }

  /* Language Chart */
  function renderLangAnalytics(repos) {
    const langs = aggregateLangs(repos);
    const top   = langs.slice(0, 8);

    if (langChartInstance) { langChartInstance.destroy(); langChartInstance = null; }

    const canvas = document.getElementById('langChart');
    const cardBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#161b22';

    if (top.length) {
      langChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: top.map(l => l.name),
          datasets: [{
            data: top.map(l => l.count),
            backgroundColor: top.map(l => getLangColor(l.name)),
            borderWidth: 2,
            borderColor: cardBg,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} repos (${top[ctx.dataIndex]?.pct ?? 0}%)` }
            }
          },
          animation: { animateRotate: true, duration: 900 }
        }
      });
    } else {
      canvas.parentElement.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:60px 0;font-size:13px;">No language data</p>';
    }

    const barsEl = document.getElementById('langBars');
    barsEl.innerHTML = top.map(l => `
      <div class="lang-bar-item">
        <span class="lang-bar-label" title="${escHtml(l.name)}">${escHtml(l.name)}</span>
        <div class="lang-bar-track">
          <div class="lang-bar-fill" style="width:0%;background:${getLangColor(l.name)}" data-w="${l.pct}%"></div>
        </div>
        <span class="lang-bar-pct">${l.pct}%</span>
      </div>`).join('');

    requestAnimationFrame(() => {
      barsEl.querySelectorAll('.lang-bar-fill').forEach(b => b.style.width = b.dataset.w);
    });
  }

  /* Repo Stats */
  function renderRepoStats(user, repos) {
    const el    = document.getElementById('repoStatGrid');
    const stars = totalStars(repos);
    const forks = totalForks(repos);
    const langs = new Set(repos.map(r => r.language).filter(Boolean)).size;
    const withDesc = repos.filter(r => r.description).length;

    el.innerHTML = `
      <div class="stat-block">
        <span class="stat-block-val">⭐ ${formatNumber(stars)}</span>
        <span class="stat-block-label">Total Stars</span>
      </div>
      <div class="stat-block">
        <span class="stat-block-val">🍴 ${formatNumber(forks)}</span>
        <span class="stat-block-label">Total Forks</span>
      </div>
      <div class="stat-block">
        <span class="stat-block-val">${langs}</span>
        <span class="stat-block-label">Languages</span>
      </div>
      <div class="stat-block">
        <span class="stat-block-val">${withDesc}</span>
        <span class="stat-block-label">With Descriptions</span>
      </div>`;
  }

  /* — Repo Cards — */
  function renderRepos(repos, method) {
    const grid   = document.getElementById('reposGrid');
    const badge  = document.getElementById('repoCountBadge');
    const sorted = sortRepos(repos, method || 'updated');
    badge.textContent = sorted.length;

    if (!sorted.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted)">No public repositories found.</div>`;
      return;
    }

    grid.innerHTML = sorted.map(r => {
      const topics = (r.topics || []).slice(0, 3);
      const lc = getLangColor(r.language);
      return `
        <article class="repo-card">
          <div class="repo-card-top">
            <a class="repo-name" href="${escHtml(r.html_url)}" target="_blank" rel="noopener">${escHtml(r.name)}</a>
            ${r.fork ? '<span class="repo-fork-badge">Fork</span>' : ''}
          </div>
          ${r.description
            ? `<p class="repo-desc">${escHtml(r.description)}</p>`
            : `<p class="repo-desc" style="opacity:.4;font-style:italic">No description</p>`}
          ${topics.length ? `<div class="repo-topics">${topics.map(t=>`<span class="repo-topic">${escHtml(t)}</span>`).join('')}</div>` : ''}
          <div class="repo-footer">
            ${r.language ? `<span class="repo-stat"><span class="lang-dot" style="background:${lc}"></span>${escHtml(r.language)}</span>` : ''}
            ${r.stargazers_count > 0 ? `<span class="repo-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>${formatNumber(r.stargazers_count)}</span>` : ''}
            ${r.forks_count > 0 ? `<span class="repo-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a9 9 0 01-9 9"/></svg>${formatNumber(r.forks_count)}</span>` : ''}
            ${r.open_issues_count > 0 ? `<span class="repo-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${r.open_issues_count}</span>` : ''}
            <span class="repo-updated">${formatDate(r.updated_at)}</span>
          </div>
        </article>`;
    }).join('');
  }

  /* — Compare — */
  function renderCompare(user1, repos1, user2, repos2) {
    const el = document.getElementById('compareView');
    const s1 = totalStars(repos1), s2 = totalStars(repos2);
    const f1 = totalForks(repos1), f2 = totalForks(repos2);

    const win = (v1, v2, side) => (side === 1 ? v1 >= v2 : v2 >= v1) ? 'winner' : '';

    const card = (user, repos, stars, forks, side) => {
      const langs = aggregateLangs(repos);
      const tl    = langs[0]?.name || 'N/A';
      return `
        <div class="compare-profile-card">
          <img class="compare-avatar" src="${escHtml(user.avatar_url)}&s=160" alt="${escHtml(user.login)}" loading="lazy"/>
          <div class="compare-name">${escHtml(user.name || user.login)}</div>
          <div class="compare-login">@${escHtml(user.login)}</div>
          <div class="compare-stats">
            <div class="compare-stat-row">
              <span class="compare-stat-label">Followers</span>
              <span class="compare-stat-val ${win(user1.followers, user2.followers, side)}">${formatNumber(user.followers)}</span>
            </div>
            <div class="compare-stat-row">
              <span class="compare-stat-label">Public Repos</span>
              <span class="compare-stat-val ${win(user1.public_repos, user2.public_repos, side)}">${user.public_repos}</span>
            </div>
            <div class="compare-stat-row">
              <span class="compare-stat-label">Total Stars</span>
              <span class="compare-stat-val ${win(s1, s2, side)}">${formatNumber(stars)}</span>
            </div>
            <div class="compare-stat-row">
              <span class="compare-stat-label">Total Forks</span>
              <span class="compare-stat-val ${win(f1, f2, side)}">${formatNumber(forks)}</span>
            </div>
            <div class="compare-stat-row">
              <span class="compare-stat-label">Top Language</span>
              <span class="compare-stat-val" style="color:${getLangColor(tl)}">${tl}</span>
            </div>
            <div class="compare-stat-row">
              <span class="compare-stat-label">Following</span>
              <span class="compare-stat-val">${formatNumber(user.following)}</span>
            </div>
          </div>
        </div>`;
    };

    el.innerHTML = card(user1, repos1, s1, f1, 1) + card(user2, repos2, s2, f2, 2);
    el.classList.remove('hidden');
  }

  /* — Rate Limit Toast — */
  function showRateLimitToast(resetTime) {
    document.querySelector('.rate-limit-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'rate-limit-toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div class="rate-limit-toast-text">
        <div class="rate-limit-toast-title">Rate Limit Reached</div>
        GitHub API limit exceeded. Try again after ${escHtml(resetTime)}.
      </div>
      <button class="toast-close" aria-label="Dismiss">✕</button>`;
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);
    setTimeout(() => toast?.remove(), 10000);
  }
// APP State
  const appState = {
    user1: null, repos1: null,
    user2: null, repos2: null,
    sortMethod: 'updated',
    compareMode: false,
    lastSearch: '',
  };
/* Theme */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }
/*  History UI */
  function refreshHistory() {
    renderHistory(getHistory(), (username) => {
      document.getElementById('searchInput').value = username;
      hideHistory();
      doSearch(username);
    });
  }

  /* Show/Hide sections */
  function showProfileSection()  { document.getElementById('profileSection').classList.remove('hidden'); }
  function hideProfileSection()  { document.getElementById('profileSection').classList.add('hidden'); }
  function showAnalytics()       { document.getElementById('analyticsRow').style.display = ''; }
  function hideAnalytics()       { document.getElementById('analyticsRow').style.display = 'none'; }
  function showRepoSection()     { document.getElementById('reposSection').style.display = ''; }
  function hideRepoSection()     { document.getElementById('reposSection').style.display = 'none'; }
  function showCompareView()     { document.getElementById('compareView').classList.remove('hidden'); }
  function hideCompareView()     { document.getElementById('compareView').classList.add('hidden'); }

  /* Main search handler */
  async function doSearch(username) {
    const trimmed = username.trim();
    if (!trimmed) {
      showSearchError('Please enter a GitHub username.');
      document.getElementById('searchInput').focus();
      return;
    }

    appState.lastSearch = trimmed;
    hideHistory();
    setSearchLoading(true);
    showLoading();

    try {
      const { user, repos } = await fetchProfile(trimmed);

      if (appState.compareMode && appState.user1) {
        appState.user2  = user;
        appState.repos2 = repos;

        renderCompare(appState.user1, appState.repos1, appState.user2, appState.repos2);

        document.getElementById('profileHeader').innerHTML = '';
        hideAnalytics();
        hideRepoSection();
        showCompareView();

        appState.compareMode = false;
        document.getElementById('compareBanner').classList.add('hidden');
        document.getElementById('btnToggleCompare').classList.remove('active');
      } else {
        appState.user1  = user;
        appState.repos1 = repos;
        appState.user2  = null;
        appState.repos2 = null;

        hideCompareView();
        showAnalytics();
        showRepoSection();

        renderProfile(user);
        renderLangAnalytics(repos);
        renderRepoStats(user, repos);
        renderRepos(repos, appState.sortMethod);
      }

      showProfileSection();
      hideLoading();
      addToHistory(trimmed);
      refreshHistory();

      setTimeout(() => {
        document.getElementById('profileSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);

    } catch (err) {
      hideLoading();
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

      if (appState.compareMode) {
        appState.compareMode = false;
        document.getElementById('compareBanner').classList.add('hidden');
        document.getElementById('btnToggleCompare').classList.remove('active');
      }
    } finally {
      setSearchLoading(false);
    }
  }
/* Sort */
  function handleSort(method) {
    appState.sortMethod = method;
    if (appState.repos1) renderRepos(appState.repos1, method);
  }
  /* Compare mode */
  function enterCompareMode() {
    if (!appState.user1) { showSearchError('Search for a user first, then compare.'); return; }
    appState.compareMode = true;
    document.getElementById('compareBanner').classList.remove('hidden');
    document.getElementById('btnToggleCompare').classList.add('active');
    const input = document.getElementById('searchInput');
    input.value = '';
    input.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exitCompareMode() {
    appState.compareMode = false;
    appState.user2 = null;
    appState.repos2 = null;
    document.getElementById('compareBanner').classList.add('hidden');
    document.getElementById('btnToggleCompare').classList.remove('active');
    hideCompareView();

    if (appState.user1) {
      showAnalytics(); showRepoSection();
      renderProfile(appState.user1);
      renderLangAnalytics(appState.repos1);
      renderRepoStats(appState.user1, appState.repos1);
      renderRepos(appState.repos1, appState.sortMethod);
      showProfileSection();
    }
  }

  /* Wire up events */

  document.getElementById('searchBtn').addEventListener('click', () =>
    doSearch(document.getElementById('searchInput').value));

  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch(e.target.value);
    if (e.key === 'Escape') hideHistory();
  });

  document.getElementById('searchInput').addEventListener('focus', () => {
    const h = getHistory();
    if (h.length) refreshHistory();
  });

  document.addEventListener('click', e => {
    if (!document.getElementById('searchContainer').contains(e.target)) hideHistory();
  });

  document.getElementById('sortSelect').addEventListener('change', e => handleSort(e.target.value));

  document.getElementById('clearHistory').addEventListener('click', () => {
    clearHistoryStore();
    hideHistory();
  });

  document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
    // Redraw chart with new bg color if visible
    if (appState.repos1) renderLangAnalytics(appState.repos1);
  });

  document.getElementById('btnRetry').addEventListener('click', () => {
    if (appState.lastSearch) doSearch(appState.lastSearch);
  });

  document.getElementById('btnToggleCompare').addEventListener('click', () => {
    appState.compareMode ? exitCompareMode() : enterCompareMode();
  });

  document.getElementById('cancelCompare').addEventListener('click', exitCompareMode);

  // ⌘K / Ctrl+K to focus search
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('searchInput').focus();
      document.getElementById('searchInput').select();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* Init */
  applyTheme(getSavedTheme());
  refreshHistory();
// Auto-search from ?user= URL param
  const urlUser = new URLSearchParams(window.location.search).get('user');
  if (urlUser) {
    document.getElementById('searchInput').value = urlUser;
    doSearch(urlUser);
  } else {
    document.getElementById('searchInput').focus();
  }

})();
