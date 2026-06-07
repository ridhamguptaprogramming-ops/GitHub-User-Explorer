/**
 * ui.js — All DOM rendering and visual state management
 */

import {
  formatNumber, formatDate, formatJoinDate,
  escHtml, getLangColor, getChartColors,
  aggregateLangs, totalStars, totalForks,
  sortRepos,
} from './utils.js';

// ── Chart instance (singleton) ─────────────────────────────────────────────
let langChartInstance = null;

// ── Loading State ──────────────────────────────────────────────────────────

export function showLoading() {
  document.getElementById('loadingState').classList.remove('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.getElementById('profileSection').classList.add('hidden');
}

export function hideLoading() {
  document.getElementById('loadingState').classList.add('hidden');
}

// ── Error State ────────────────────────────────────────────────────────────

export function showError(title, message) {
  hideLoading();
  document.getElementById('errorTitle').textContent = title;
  document.getElementById('errorMsg').textContent = message;
  document.getElementById('errorState').classList.remove('hidden');
  document.getElementById('profileSection').classList.add('hidden');
}

export function hideError() {
  document.getElementById('errorState').classList.add('hidden');
}

// ── Search UI ──────────────────────────────────────────────────────────────

export function setSearchLoading(loading) {
  const btn = document.getElementById('searchBtn');
  const spinner = btn.querySelector('.btn-spinner');
  const text = btn.querySelector('.btn-text');
  const input = document.getElementById('searchInput');

  if (loading) {
    spinner.classList.remove('hidden');
    text.classList.add('hidden');
    btn.disabled = true;
    input.disabled = true;
  } else {
    spinner.classList.add('hidden');
    text.classList.remove('hidden');
    btn.disabled = false;
    input.disabled = false;
  }
}

export function showSearchError(msg) {
  const el = document.getElementById('searchError');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ── History UI ─────────────────────────────────────────────────────────────

export function renderHistory(history, onSelect) {
  const container = document.getElementById('searchHistory');
  const list = document.getElementById('historyList');

  if (!history.length) {
    container.classList.add('hidden');
    return;
  }

  list.innerHTML = history.map(u => `
    <div class="history-item" data-user="${escHtml(u)}" role="button" tabindex="0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      ${escHtml(u)}
    </div>
  `).join('');

  list.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => onSelect(item.dataset.user));
    item.addEventListener('keydown', e => e.key === 'Enter' && onSelect(item.dataset.user));
  });

  container.classList.remove('hidden');
}

export function hideHistory() {
  document.getElementById('searchHistory').classList.add('hidden');
}

// ── Profile Header ─────────────────────────────────────────────────────────

export function renderProfile(user) {
  const container = document.getElementById('profileHeader');

  const metaItems = [
    user.location && `
      <span class="meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${escHtml(user.location)}
      </span>`,
    user.company && `
      <span class="meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
        ${escHtml(user.company.replace('@', ''))}
      </span>`,
    user.blog && `
      <span class="meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        <a href="${user.blog.startsWith('http') ? escHtml(user.blog) : 'https://' + escHtml(user.blog)}"
           target="_blank" rel="noopener">${escHtml(user.blog)}</a>
      </span>`,
    user.created_at && `
      <span class="meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Joined ${formatJoinDate(user.created_at)}
      </span>`,
    user.twitter_username && `
      <span class="meta-item">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/></svg>
        @${escHtml(user.twitter_username)}
      </span>`,
  ].filter(Boolean).join('');

  container.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar-wrap">
        <img class="profile-avatar"
             src="${escHtml(user.avatar_url)}&s=240"
             alt="${escHtml(user.login)}'s avatar"
             loading="lazy" />
      </div>
      <div class="profile-details">
        <div class="profile-name">${escHtml(user.name || user.login)}</div>
        <div class="profile-login">@${escHtml(user.login)}</div>
        ${user.bio ? `<div class="profile-bio">${escHtml(user.bio)}</div>` : ''}
        ${metaItems ? `<div class="profile-meta">${metaItems}</div>` : ''}
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
          ${user.public_gists > 0 ? `
          <div class="stat-pill">
            <span class="stat-pill-val">${formatNumber(user.public_gists)}</span>
            <span class="stat-pill-label">Gists</span>
          </div>` : ''}
        </div>
        <div class="profile-actions">
          <a class="btn-github" href="${escHtml(user.html_url)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  `;
}

// ── Language Analytics ─────────────────────────────────────────────────────

export function renderLangAnalytics(repos) {
  const langs = aggregateLangs(repos);
  const top = langs.slice(0, 8);

  // Pie Chart
  if (langChartInstance) {
    langChartInstance.destroy();
    langChartInstance = null;
  }

  const canvas = document.getElementById('langChart');
  if (top.length > 0) {
    langChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: top.map(l => l.name),
        datasets: [{
          data: top.map(l => l.count),
          backgroundColor: getChartColors(top.map(l => l.name)),
          borderWidth: 2,
          borderColor: getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-card').trim() || '#161b22',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} repos (${langs[ctx.dataIndex]?.pct ?? 0}%)`
            }
          }
        },
        animation: { animateRotate: true, duration: 800 }
      }
    });
  } else {
    canvas.parentElement.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:60px 0;font-size:13px;">No language data available</p>';
  }

  // Progress Bars
  const barsEl = document.getElementById('langBars');
  barsEl.innerHTML = top.map(l => `
    <div class="lang-bar-item">
      <span class="lang-bar-label" title="${escHtml(l.name)}">${escHtml(l.name)}</span>
      <div class="lang-bar-track">
        <div class="lang-bar-fill" style="width:0%;background:${getLangColor(l.name)}"
             data-width="${l.pct}%"></div>
      </div>
      <span class="lang-bar-pct">${l.pct}%</span>
    </div>
  `).join('');

  // Animate bars after paint
  requestAnimationFrame(() => {
    barsEl.querySelectorAll('.lang-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  });
}

// ── Repo Stats Card ────────────────────────────────────────────────────────

export function renderRepoStats(user, repos) {
  const el = document.getElementById('repoStatGrid');
  const stars = totalStars(repos);
  const forks = totalForks(repos);
  const withDesc = repos.filter(r => r.description).length;
  const langs = new Set(repos.map(r => r.language).filter(Boolean)).size;

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
    </div>
  `;
}

// ── Repository Cards ───────────────────────────────────────────────────────

export function renderRepos(repos, sortMethod = 'updated') {
  const grid = document.getElementById('reposGrid');
  const badge = document.getElementById('repoCountBadge');

  const sorted = sortRepos(repos, sortMethod);
  badge.textContent = sorted.length;

  if (!sorted.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">
        No public repositories found.
      </div>`;
    return;
  }

  grid.innerHTML = sorted.map(repo => {
    const langColor = getLangColor(repo.language);
    const topics = repo.topics?.slice(0, 3) || [];

    return `
      <article class="repo-card">
        <div class="repo-card-top">
          <a class="repo-name" href="${escHtml(repo.html_url)}" target="_blank" rel="noopener">
            ${escHtml(repo.name)}
          </a>
          ${repo.fork ? '<span class="repo-fork-badge">Fork</span>' : ''}
        </div>

        ${repo.description
          ? `<p class="repo-desc">${escHtml(repo.description)}</p>`
          : '<p class="repo-desc" style="opacity:0.4;font-style:italic;">No description</p>'}

        ${topics.length ? `
          <div class="repo-topics">
            ${topics.map(t => `<span class="repo-topic">${escHtml(t)}</span>`).join('')}
          </div>` : ''}

        <div class="repo-footer">
          ${repo.language ? `
            <span class="repo-stat">
              <span class="lang-dot" style="background:${langColor}"></span>
              ${escHtml(repo.language)}
            </span>` : ''}

          ${repo.stargazers_count > 0 ? `
            <span class="repo-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
              ${formatNumber(repo.stargazers_count)}
            </span>` : ''}

          ${repo.forks_count > 0 ? `
            <span class="repo-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/>
                <circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
                <path d="M18 9a9 9 0 01-9 9"/>
              </svg>
              ${formatNumber(repo.forks_count)}
            </span>` : ''}

          ${repo.open_issues_count > 0 ? `
            <span class="repo-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              ${repo.open_issues_count}
            </span>` : ''}

          <span class="repo-updated">${formatDate(repo.updated_at)}</span>
        </div>
      </article>
    `;
  }).join('');
}

// ── Compare View ───────────────────────────────────────────────────────────

export function renderCompare(user1, repos1, user2, repos2) {
  const el = document.getElementById('compareView');

  const stars1 = totalStars(repos1);
  const stars2 = totalStars(repos2);
  const forks1 = totalForks(repos1);
  const forks2 = totalForks(repos2);

  const w = (v1, v2) => ({
    1: v1 >= v2 ? 'winner' : '',
    2: v2 >= v1 ? 'winner' : '',
  });

  const profileCard = (user, repos, stars, forks, side) => {
    const wStars = side === 1 ? w(stars1, stars2)[1] : w(stars1, stars2)[2];
    const wForks = side === 1 ? w(forks1, forks2)[1] : w(forks1, forks2)[2];
    const wFollowers = side === 1 ? w(user1.followers, user2.followers)[1] : w(user1.followers, user2.followers)[2];
    const wRepos = side === 1 ? w(user1.public_repos, user2.public_repos)[1] : w(user1.public_repos, user2.public_repos)[2];
    const langs = aggregateLangs(repos);
    const topLang = langs[0]?.name || 'N/A';

    return `
      <div class="compare-profile-card">
        <img class="compare-avatar" src="${escHtml(user.avatar_url)}&s=160"
             alt="${escHtml(user.login)}" loading="lazy" />
        <div class="compare-name">${escHtml(user.name || user.login)}</div>
        <div class="compare-login">@${escHtml(user.login)}</div>
        <div class="compare-stats">
          <div class="compare-stat-row">
            <span class="compare-stat-label">Followers</span>
            <span class="compare-stat-val ${wFollowers}">${formatNumber(user.followers)}</span>
          </div>
          <div class="compare-stat-row">
            <span class="compare-stat-label">Public Repos</span>
            <span class="compare-stat-val ${wRepos}">${user.public_repos}</span>
          </div>
          <div class="compare-stat-row">
            <span class="compare-stat-label">Total Stars</span>
            <span class="compare-stat-val ${wStars}">${formatNumber(stars)}</span>
          </div>
          <div class="compare-stat-row">
            <span class="compare-stat-label">Total Forks</span>
            <span class="compare-stat-val ${wForks}">${formatNumber(forks)}</span>
          </div>
          <div class="compare-stat-row">
            <span class="compare-stat-label">Top Language</span>
            <span class="compare-stat-val" style="color:${getLangColor(topLang)}">${topLang}</span>
          </div>
          <div class="compare-stat-row">
            <span class="compare-stat-label">Following</span>
            <span class="compare-stat-val">${formatNumber(user.following)}</span>
          </div>
        </div>
      </div>
    `;
  };

  el.innerHTML =
    profileCard(user1, repos1, stars1, forks1, 1) +
    profileCard(user2, repos2, stars2, forks2, 2);

  el.classList.remove('hidden');
}

export function hideCompareView() {
  document.getElementById('compareView').classList.add('hidden');
}

// ── Rate Limit Toast ───────────────────────────────────────────────────────

export function showRateLimitToast(resetTime) {
  // Remove existing toast
  document.querySelector('.rate-limit-toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'rate-limit-toast';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <div class="rate-limit-toast-text">
      <div class="rate-limit-toast-title">API Rate Limit Reached</div>
      GitHub API limit exceeded. Try again after ${escHtml(resetTime)}.
    </div>
    <button class="toast-close" aria-label="Close">✕</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);
  setTimeout(() => toast?.remove(), 10000);
}

// ── Show Profile Section ───────────────────────────────────────────────────

export function showProfileSection() {
  document.getElementById('profileSection').classList.remove('hidden');
}

export function hideProfileSection() {
  document.getElementById('profileSection').classList.add('hidden');
}
