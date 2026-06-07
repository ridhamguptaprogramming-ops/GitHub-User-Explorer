import {
  formatNumber, formatDate, formatJoinDate, escHtml, getLangColor, getChartColors,
  aggregateLangs, totalStars, totalForks, getActivitySets,
  getHealthStatus, generateHeatmapData, getAchievementBadges, getTopRepos,
} from './utils.js';

let langChartInstance = null;

export function showLoading() {
  document.getElementById('loadingState').classList.remove('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.getElementById('profileSection').classList.add('hidden');
}

export function hideLoading() {
  document.getElementById('loadingState').classList.add('hidden');
}

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
  setTimeout(() => el.classList.add('hidden'), 3800);
}

export function renderHistory(history, onSelect) {
  const container = document.getElementById('searchHistory');
  const list = document.getElementById('historyList');
  if (!history.length) { container.classList.add('hidden'); return; }
  list.innerHTML = history.map(item => `
    <div class="history-item" data-user="${escHtml(item)}" tabindex="0" role="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      ${escHtml(item)}
    </div>
  `).join('');
  list.querySelectorAll('.history-item').forEach(element => {
    element.addEventListener('click', () => onSelect(element.dataset.user));
    element.addEventListener('keydown', e => e.key === 'Enter' && onSelect(element.dataset.user));
  });
  container.classList.remove('hidden');
}

export function hideHistory() {
  document.getElementById('searchHistory').classList.add('hidden');
}

export function renderProfile(user, isFavorite) {
  const el = document.getElementById('profileHeader');
  const metaItems = [
    user.location && `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${escHtml(user.location)}</span>`,
    user.company && `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>${escHtml(user.company.replace('@', ''))}</span>`,
    user.blog && `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg><a href="${user.blog.startsWith('http') ? escHtml(user.blog) : 'https://' + escHtml(user.blog)}" target="_blank" rel="noopener">${escHtml(user.blog)}</a></span>`,
    user.created_at && `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Joined ${formatJoinDate(user.created_at)}</span>`,
    user.twitter_username && `<span class="meta-item"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/></svg>@${escHtml(user.twitter_username)}</span>`,
  ].filter(Boolean).join('');

  el.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar-wrap"><img class="profile-avatar" src="${escHtml(user.avatar_url)}&s=240" alt="${escHtml(user.login)} avatar" loading="lazy" /></div>
      <div class="profile-details">
        <div class="profile-name">${escHtml(user.name || user.login)}</div>
        <div class="profile-login">@${escHtml(user.login)}</div>
        ${user.bio ? `<p class="profile-bio">${escHtml(user.bio)}</p>` : '<p class="profile-bio">No bio available.</p>'}
        ${metaItems ? `<div class="profile-meta">${metaItems}</div>` : ''}
        <div class="profile-stats">
          <div class="stat-pill"><span class="stat-pill-val">${formatNumber(user.followers)}</span><span class="stat-pill-label">Followers</span></div>
          <div class="stat-pill"><span class="stat-pill-val">${formatNumber(user.following)}</span><span class="stat-pill-label">Following</span></div>
          <div class="stat-pill"><span class="stat-pill-val">${formatNumber(user.public_repos)}</span><span class="stat-pill-label">Repos</span></div>
          ${user.public_gists > 0 ? `<div class="stat-pill"><span class="stat-pill-val">${formatNumber(user.public_gists)}</span><span class="stat-pill-label">Gists</span></div>` : ''}
        </div>
        <div class="profile-actions"><a class="btn-github" href="${escHtml(user.html_url)}" target="_blank" rel="noopener">View on GitHub</a></div>
      </div>
    </div>
  `;
}

export function renderProfileSummary(text) {
  document.getElementById('profileSummary').textContent = text;
}

export function renderDevScore(score) {
  document.getElementById('devScoreCard').innerHTML = `Developer Score: <span>${score}/100</span>`;
}

export function updateBookmarkButton(isFavorite) {
  const btn = document.getElementById('toggleBookmarkBtn');
  btn.textContent = isFavorite ? 'Saved to favorites' : 'Save favorite';
  btn.classList.toggle('saved', isFavorite);
}

export function renderAchievementBadges(badges) {
  const container = document.getElementById('achievementBadges');
  container.innerHTML = badges.map(item => `<span class="badge-pill">${escHtml(item)}</span>`).join('');
}

export function renderRepoInsights(insights) {
  const card = document.getElementById('repoInsightsCard');
  card.innerHTML = `
    <h3 class="card-title">Repository Insights</h3>
    <div class="repo-insight-list">
      <div class="insight-row"><span>Total Stars</span><strong>${formatNumber(insights.totalStars)}</strong></div>
      <div class="insight-row"><span>Total Forks</span><strong>${formatNumber(insights.totalForks)}</strong></div>
      <div class="insight-row"><span>Average stars / repo</span><strong>${formatNumber(insights.avgStars)}</strong></div>
      <div class="insight-row"><span>Most starred repo</span><strong>${insights.mostStarred ? escHtml(insights.mostStarred.name) : 'N/A'}</strong></div>
      <div class="insight-row"><span>Most forked repo</span><strong>${insights.mostForked ? escHtml(insights.mostForked.name) : 'N/A'}</strong></div>
    </div>
  `;
}

export function renderActivityInsights(activity) {
  const card = document.getElementById('activityInsightsCard');
  const renderList = (items) => items.map(repo => `<li>${escHtml(repo.name)} <span>${formatDate(repo.updated_at)}</span></li>`).join('');
  card.innerHTML = `
    <h3 class="card-title">Activity Dashboard</h3>
    <div class="activity-panel">
      <div><strong>Updated</strong><ul>${renderList(activity.byUpdated)}</ul></div>
      <div><strong>Created</strong><ul>${renderList(activity.byCreated)}</ul></div>
      <div><strong>Pushed</strong><ul>${renderList(activity.byPushed)}</ul></div>
    </div>
  `;
}

export function renderTrending(repos) {
  const card = document.getElementById('trendingCard');
  const { trending, recent } = getTopRepos(repos, 3);
  const starred = trending.map(repo => `<li><a href="${escHtml(repo.html_url)}" target="_blank" rel="noopener">${escHtml(repo.name)}</a> <span>${formatNumber(repo.stargazers_count)} stars</span></li>`).join('');
  const recentHtml = recent.map(repo => `<li><a href="${escHtml(repo.html_url)}" target="_blank" rel="noopener">${escHtml(repo.name)}</a> <span>${formatDate(repo.updated_at)}</span></li>`).join('');
  card.innerHTML = `
    <h3 class="card-title">Trending Projects</h3>
    <div class="trending-panels">
      <div><strong>Top starred</strong><ul>${starred}</ul></div>
      <div><strong>Recently popular</strong><ul>${recentHtml}</ul></div>
    </div>
  `;
}

export function renderLangAnalytics(repos) {
  const langs = aggregateLangs(repos);
  const top = langs.slice(0, 8);
  const canvas = document.getElementById('langChart');
  if (langChartInstance) {
    langChartInstance.destroy();
    langChartInstance = null;
  }
  if (top.length) {
    langChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: top.map(item => item.name),
        datasets: [{ data: top.map(item => item.count), backgroundColor: getChartColors(top.map(item => item.name)), borderWidth: 2, borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#111624' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} repos (${top[ctx.dataIndex]?.pct ?? 0}%)` } } }, animation: { duration: 800 } }
    });
  } else {
    canvas.parentElement.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:64px 0;font-size:0.95rem;">No language data available.</p>';
  }

  document.getElementById('topLanguageTag').textContent = langs[0] ? `${langs[0].name} is most used` : 'No dominant language yet';
  const barsEl = document.getElementById('langBars');
  barsEl.innerHTML = top.map(item => `
    <div class="lang-bar-item">
      <span class="lang-bar-label">${escHtml(item.name)}</span>
      <div class="lang-bar-track"><div class="lang-bar-fill" style="width:0%;background:${getLangColor(item.name)}" data-width="${item.pct}%"></div></div>
      <span class="lang-bar-pct">${item.pct}%</span>
    </div>
  `).join('');
  requestAnimationFrame(() => barsEl.querySelectorAll('.lang-bar-fill').forEach(bar => bar.style.width = bar.dataset.width));
}

export function renderRepoStats(user, repos) {
  const el = document.getElementById('repoStatGrid');
  const stars = totalStars(repos);
  const forks = totalForks(repos);
  const languages = new Set(repos.map(repo => repo.language).filter(Boolean)).size;
  const descriptions = repos.filter(repo => repo.description).length;
  el.innerHTML = `
    <div class="stat-block"><span class="stat-block-val">⭐ ${formatNumber(stars)}</span><span class="stat-block-label">Total Stars</span></div>
    <div class="stat-block"><span class="stat-block-val">🍴 ${formatNumber(forks)}</span><span class="stat-block-label">Total Forks</span></div>
    <div class="stat-block"><span class="stat-block-val">${languages}</span><span class="stat-block-label">Languages</span></div>
    <div class="stat-block"><span class="stat-block-val">${descriptions}</span><span class="stat-block-label">With Descriptions</span></div>
  `;
}

export function renderHeatmap(repos) {
  const data = generateHeatmapData(repos);
  const grid = document.getElementById('heatmapGrid');
  grid.innerHTML = data.map(level => `<div class="heatmap-day level-${level}"></div>`).join('');
}

export function renderFollowers(followers, following) {
  const followersEl = document.getElementById('followersPreview');
  const followingEl = document.getElementById('followingPreview');
  followersEl.innerHTML = followers.slice(0, 6).map(user => `
    <div class="follow-pill"><img class="follow-avatar" src="${escHtml(user.avatar_url)}&s=120" alt="${escHtml(user.login)}" loading="lazy" /><span class="follow-name"><strong>${escHtml(user.login)}</strong><span>Follower</span></span></div>
  `).join('') || '<p style="color:var(--text-secondary)">No followers preview available.</p>';
  followingEl.innerHTML = following.slice(0, 6).map(user => `
    <div class="follow-pill"><img class="follow-avatar" src="${escHtml(user.avatar_url)}&s=120" alt="${escHtml(user.login)}" loading="lazy" /><span class="follow-name"><strong>${escHtml(user.login)}</strong><span>Following</span></span></div>
  `).join('') || '<p style="color:var(--text-secondary)">No following preview available.</p>';
}

export function renderFavorites(favorites, onView, onRemove) {
  const container = document.getElementById('favoritesGrid');
  if (!favorites.length) {
    container.innerHTML = '<div style="color:var(--text-secondary);">Save developers to favorites for quick access.</div>';
    return;
  }
  container.innerHTML = favorites.map(item => `
    <div class="favorite-pill" data-login="${escHtml(item.login)}">
      <img class="follow-avatar" src="${escHtml(item.avatar_url)}&s=120" alt="${escHtml(item.login)}" loading="lazy" />
      <span class="follow-name"><strong>${escHtml(item.name || item.login)}</strong><span>@${escHtml(item.login)}</span></span>
      <button type="button" class="favorite-remove" aria-label="Remove favorite">✕</button>
    </div>
  `).join('');
  container.querySelectorAll('.favorite-pill').forEach(card => {
    const login = card.dataset.login;
    card.addEventListener('click', e => {
      if (e.target.closest('.favorite-remove')) return;
      onView(login);
    });
    card.querySelector('.favorite-remove').addEventListener('click', e => {
      e.stopPropagation();
      onRemove(login);
    });
  });
}

export function renderRepos(repos, sortMethod = 'updated') {
  const grid = document.getElementById('reposGrid');
  const badge = document.getElementById('repoCountBadge');
  const sorted = sortMethod ? sortRepos(repos, sortMethod) : repos;
  badge && (badge.textContent = sorted.length);
  if (!sorted.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-secondary);">No public repositories match the current filters.</div>';
    return;
  }
  grid.innerHTML = sorted.map(repo => {
    const health = getHealthStatus(repo);
    const langColor = getLangColor(repo.language);
    const topics = repo.topics?.slice(0, 3) || [];
    return `
      <article class="repo-card">
        <div class="repo-card-top">
          <a class="repo-name" href="${escHtml(repo.html_url)}" target="_blank" rel="noopener">${escHtml(repo.name)}</a>
          <span class="repo-health ${health.modifier}">${health.label}</span>
        </div>
        <p class="repo-desc">${repo.description ? escHtml(repo.description) : 'No description available.'}</p>
        ${topics.length ? `<div class="repo-topics">${topics.map(topic => `<span class="repo-topic">${escHtml(topic)}</span>`).join('')}</div>` : ''}
        <div class="repo-footer">
          ${repo.language ? `<span class="repo-stat"><span class="lang-dot" style="background:${langColor}"></span>${escHtml(repo.language)}</span>` : ''}
          <span class="repo-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>${formatNumber(repo.stargazers_count)}</span>
          <span class="repo-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a9 9 0 01-9 9"/></svg>${formatNumber(repo.forks_count)}</span>
          <span class="repo-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${repo.open_issues_count || 0}</span>
          <span class="repo-updated">${formatDate(repo.updated_at)}</span>
        </div>
      </article>
    `;
  }).join('');
}

export function renderCompare(user1, repos1, user2, repos2) {
  const el = document.getElementById('compareView');
  const score1 = totalStars(repos1);
  const score2 = totalStars(repos2);
  const win = (value, other) => value >= other ? 'winner' : '';
  const buildCard = (user, repos, primary, secondary, side) => {
    const topLang = aggregateLangs(repos)[0]?.name || 'N/A';
    return `
      <div class="compare-profile-card ${side}">
        <img class="compare-avatar" src="${escHtml(user.avatar_url)}&s=160" alt="${escHtml(user.login)}" loading="lazy" />
        <div class="compare-name">${escHtml(user.name || user.login)}</div>
        <div class="compare-login">@${escHtml(user.login)}</div>
        <div class="compare-stats">
          <div class="compare-stat-row"><span>Followers</span><strong class="${win(user1.followers, user2.followers)}">${formatNumber(user.followers)}</strong></div>
          <div class="compare-stat-row"><span>Repos</span><strong class="${win(user1.public_repos, user2.public_repos)}">${formatNumber(user.public_repos)}</strong></div>
          <div class="compare-stat-row"><span>Stars</span><strong class="${win(score1, score2)}">${formatNumber(totalStars(repos))}</strong></div>
          <div class="compare-stat-row"><span>Forks</span><strong class="${win(totalForks(repos1), totalForks(repos2))}">${formatNumber(totalForks(repos))}</strong></div>
          <div class="compare-stat-row"><span>Top language</span><strong>${escHtml(topLang)}</strong></div>
          <div class="compare-stat-row"><span>Following</span><strong>${formatNumber(user.following)}</strong></div>
        </div>
      </div>
    `;
  };
  el.innerHTML = buildCard(user1, repos1, score1, score2, 'left') + buildCard(user2, repos2, score2, score1, 'right');
  el.classList.remove('hidden');
}

export function showRateLimitToast(resetTime) {
  document.querySelector('.rate-limit-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'rate-limit-toast';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <div class="rate-limit-toast-text"><div class="rate-limit-toast-title">Rate Limit Reached</div>GitHub API limit exceeded. Try again after ${escHtml(resetTime)}.</div>
    <button class="toast-close" aria-label="Dismiss">✕</button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 10000);
}

export function showProfileSection() { document.getElementById('profileSection').classList.remove('hidden'); }
export function hideProfileSection() { document.getElementById('profileSection').classList.add('hidden'); }

function sortRepos(repos, method) {
  const sorted = [...repos];
  switch (method) {
    case 'stars': return sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
    case 'name': return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'forks': return sorted.sort((a, b) => b.forks_count - a.forks_count);
    default: return sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
}
