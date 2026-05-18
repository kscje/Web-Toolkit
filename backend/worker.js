const _rateLimiter = { submissions: new Map(), tokens: new Map() };

function checkRateLimit(map, key, maxRequests, windowMs) {
  const now = Date.now();
  const record = map.get(key);
  if (!record || now - record.start > windowMs) {
    map.set(key, { start: now, count: 1 });
    return false;
  }
  record.count++;
  return record.count > maxRequests;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method === 'POST' && url.pathname === '/api/suggestions') {
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (checkRateLimit(_rateLimiter.submissions, clientIP, 5, 60000)) {
        return json({ error: 'Too many requests' }, 429, corsHeaders);
      }
      return handleSubmit(request, env, corsHeaders);
    }
    if (request.method === 'GET' && url.pathname === '/api/suggestions') {
      return handleList(request, env, corsHeaders);
    }
    if (request.method === 'GET' && url.pathname === '/api/submit-token') {
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (checkRateLimit(_rateLimiter.tokens, clientIP, 10, 60000)) {
        return json({ error: 'Too many requests' }, 429, corsHeaders);
      }
      return handleGetSubmitToken(request, env, corsHeaders);
    }
    if (request.method === 'GET' && url.pathname === '/api/ping') {
      return handlePing(request, env, corsHeaders);
    }
    if (request.method === 'GET' && url.pathname === '/admin') {
      return new Response(getAdminHtml(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response('TextFlow Suggestion API — OK', { headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  },
};

async function handleGetSubmitToken(request, env, corsHeaders) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(env.SUBMIT_TOKEN),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(timestamp)));
    const token = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return json({ token, timestamp }, 200, corsHeaders);
  } catch (err) {
    return json({ error: 'Server error' }, 500, corsHeaders);
  }
}

async function handleSubmit(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { content, page_url, page_title, token, timestamp } = body;

    if (!token || !timestamp) return json({ error: 'Unauthorized' }, 401, corsHeaders);
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > 300) return json({ error: 'Token expired' }, 401, corsHeaders);

    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(env.SUBMIT_TOKEN),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(timestamp)));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (token !== expected) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    if (!content || typeof content !== 'string' || content.trim().length === 0) return json({ error: 'Content required' }, 400, corsHeaders);
    if (content.length > 500) return json({ error: 'Content too long' }, 400, corsHeaders);

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.DB.prepare('INSERT INTO suggestions (id, content, page_url, page_title, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, content.trim(), page_url || '', page_title || '', createdAt).run();

    return json({ success: true, id, created_at: createdAt }, 201, corsHeaders);
  } catch (err) { return json({ error: 'Server error' }, 500, corsHeaders); }
}

async function handleList(request, env, corsHeaders) {
  const token = extractToken(request);
  if (!token || token !== env.ADMIN_TOKEN) return json({ error: 'Unauthorized' }, 401, corsHeaders);
  try {
    const { results } = await env.DB.prepare('SELECT id, content, page_url, page_title, created_at FROM suggestions ORDER BY created_at DESC LIMIT 200').all();
    return json(results, 200, corsHeaders);
  } catch (err) { return json({ error: 'Server error' }, 500, corsHeaders); }
}

async function handlePing(request, env, corsHeaders) {
  const token = extractToken(request);
  const secretSet = !!env.ADMIN_TOKEN;
  const match = secretSet && token === env.ADMIN_TOKEN;
  return json({ secret_set: secretSet, auth_ok: match }, match ? 200 : 401, corsHeaders);
}

function extractToken(request) {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return '';
}

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function getAdminHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextFlow \u2014 \u5efa\u8bae\u7ba1\u7406\u9762\u677f</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #f5f6fa;
      --surface: #ffffff;
      --text: #1a1a2e;
      --text-muted: #6b7280;
      --border: #e5e7eb;
      --accent: #4361ee;
      --accent-hover: #3a56d4;
      --danger: #ef4444;
      --success: #10b981;
      --radius: 12px;
      --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
    }

    .container {
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 16px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .header-left h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }

    .header-left .subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .refresh-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .refresh-btn .spin {
      display: inline-block;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .login-card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 32px;
      box-shadow: var(--shadow);
      border: 1.5px solid var(--border);
    }

    .login-card h2 {
      font-size: 16px;
      margin-bottom: 4px;
    }

    .login-card p {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    .token-input-row {
      display: flex;
      gap: 8px;
    }

    .token-input-row input {
      flex: 1;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      font-size: 13px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      background: var(--bg);
      transition: border-color 0.15s;
    }

    .token-input-row input:focus {
      border-color: var(--accent);
      outline: none;
      box-shadow: 0 0 0 3px rgba(67,97,238,0.08);
    }

    .token-input-row button {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      background: var(--accent);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .token-input-row button:hover {
      background: var(--accent-hover);
    }

    .stats-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .stats-bar strong {
      color: var(--text);
    }

    .suggestion-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .suggestion-card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 16px 18px;
      box-shadow: var(--shadow);
      border: 1.5px solid var(--border);
      transition: border-color 0.15s;
    }

    .suggestion-card:hover {
      border-color: #c7d2fe;
    }

    .suggestion-card .meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 11px;
      color: var(--text-muted);
    }

    .suggestion-card .meta .time {
      font-weight: 600;
    }

    .suggestion-card .content {
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .suggestion-card .source {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .suggestion-card .source a {
      color: var(--accent);
      text-decoration: none;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .suggestion-card .source a:hover {
      text-decoration: underline;
    }

    .empty-state {
      text-align: center;
      padding: 48px 16px;
      color: var(--text-muted);
    }

    .empty-state .icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state p {
      font-size: 13px;
    }

    .error-banner {
      background: #fef2f2;
      border: 1.5px solid #fecaca;
      border-radius: var(--radius);
      padding: 12px 16px;
      color: var(--danger);
      font-size: 13px;
      margin-bottom: 16px;
    }

    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius);
      padding: 20px;
      border: 1.5px solid var(--border);
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skeleton .line { height: 14px; background: #ddd; border-radius: 4px; margin-bottom: 8px; }
    .skeleton .line.short { width: 30%; }

    .logout-link {
      font-size: 11px;
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: underline;
      margin-left: 12px;
    }

    .logout-link:hover { color: var(--danger); }

    .footer {
      text-align: center;
      padding: 24px 0;
      font-size: 11px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container" id="app"></div>

  <script>
    (function () {
      'use strict';

      var API_URL = 'https://textflow-suggestions.webtoolkit-sug.workers.dev/api/suggestions';
      var TOKEN_KEY = 'wt_admin_token';

      var app = document.getElementById('app');

      function getToken() {
        return sessionStorage.getItem(TOKEN_KEY) || '';
      }

      function setToken(t) {
        sessionStorage.setItem(TOKEN_KEY, t);
      }

      function clearToken() {
        sessionStorage.removeItem(TOKEN_KEY);
      }

      function renderLogin() {
        app.innerHTML = '<div class="container" style="margin-top:60px">'
          + '<div class="login-card">'
          + '<h2>\ud83d\udd10 \u9a8c\u8bc1\u8eab\u4efd</h2>'
          + '<p>\u8bf7\u8f93\u5165 ADMIN_TOKEN \u4ee5\u67e5\u770b\u7528\u6237\u63d0\u4ea4\u7684\u5efa\u8bae</p>'
          + '<div class="token-input-row">'
          + '<input type="password" id="tokenInput" placeholder="\u8f93\u5165 ADMIN_TOKEN..." autofocus>'
          + '<button id="loginBtn">\u767b\u5165</button>'
          + '</div>'
          + '</div>'
          + '</div>';

        var input = document.getElementById('tokenInput');
        var btn = document.getElementById('loginBtn');

        function doLogin() {
          var val = input.value.trim();
          if (!val) return;
          setToken(val);
          renderMain();
        }

        btn.addEventListener('click', doLogin);
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') doLogin();
        });
      }

      function renderMain() {
        var token = getToken();

        app.innerHTML = ''
          + '<div class="header">'
          + '<div class="header-left">'
          + '<h1>\ud83d\udcca \u5efa\u8bae\u7ba1\u7406\u9762\u677f</h1>'
          + '<div class="subtitle">TextFlow \u2014 \u7528\u6237\u529f\u80fd\u5efa\u8bae\u6536\u96c6</div>'
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:8px;">'
          + '<button class="refresh-btn" id="refreshBtn">\ud83d\udd04 \u5237\u65b0</button>'
          + '<span class="logout-link" id="logoutLink">\u9000\u51fa</span>'
          + '</div>'
          + '</div>'
          + '<div id="statsBar"></div>'
          + '<div id="suggestionList">'
          + '<div class="skeleton"><div class="line"></div><div class="line short"></div></div>'
          + '<div class="skeleton"><div class="line"></div><div class="line short"></div></div>'
          + '<div class="skeleton"><div class="line"></div><div class="line short"></div></div>'
          + '</div>'
          + '<div class="footer">\u6570\u636e\u6765\u6e90: Cloudflare D1 \u00b7 '
          + (new Date()).toISOString().slice(0, 10)
          + '</div>';

        document.getElementById('logoutLink').addEventListener('click', function () {
          clearToken();
          renderLogin();
        });

        document.getElementById('refreshBtn').addEventListener('click', function () {
          fetchSuggestions(token);
        });

        fetchSuggestions(token);
      }

      function fetchSuggestions(token) {
        var listEl = document.getElementById('suggestionList');
        var statsEl = document.getElementById('statsBar');
        var btn = document.getElementById('refreshBtn');

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="spin">\ud83d\udd04</span> \u5237\u65b0\u4e2d\u2026';
        }

        fetch(API_URL, {
          headers: { 'Authorization': 'Bearer ' + token }
        })
          .then(function (res) {
            if (res.status === 401) {
              throw new Error('UNAUTHORIZED');
            }
            if (!res.ok) {
              throw new Error('HTTP ' + res.status);
            }
            return res.json();
          })
          .then(function (data) {
            if (!Array.isArray(data)) {
              throw new Error('Invalid response format');
            }
            renderSuggestions(data, listEl, statsEl);
          })
          .catch(function (err) {
            if (err.message === 'UNAUTHORIZED') {
              clearToken();
              renderLogin();
              return;
            }
            listEl.innerHTML = '<div class="error-banner">\u26a0\ufe0f \u52a0\u8f7d\u5931\u8d25: ' + escapeHtml(err.message) + '</div>';
          })
          .finally(function () {
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = '\ud83d\udd04 \u5237\u65b0';
            }
          });
      }

      function renderSuggestions(items, listEl, statsEl) {
        if (statsEl) {
          statsEl.innerHTML = '<div class="stats-bar">'
            + '<span>\u5171 <strong>' + items.length + '</strong> \u6761\u5efa\u8bae</span>'
            + (items.length > 0 ? '<span>\u6700\u65b0: <strong>' + formatTime(items[0].created_at) + '</strong></span>' : '')
            + '</div>';
        }

        if (items.length === 0) {
          listEl.innerHTML = '<div class="empty-state">'
            + '<div class="icon">\ud83d\udced</div>'
            + '<p>\u8fd8\u6ca1\u6709\u4efb\u4f55\u5efa\u8bae</p>'
            + '<p style="font-size:11px;margin-top:4px;">\u7528\u6237\u63d0\u4ea4\u5efa\u8bae\u540e\u4f1a\u51fa\u73b0\u5728\u8fd9\u91cc</p>'
            + '</div>';
          return;
        }

        var html = '<div class="suggestion-list">';
        items.forEach(function (item) {
          var hasSource = item.page_url || item.page_title;
          html += '<div class="suggestion-card">'
            + '<div class="meta">'
            + '<span class="time">' + formatTime(item.created_at) + '</span>'
            + '<span>' + escapeHtml(item.id.slice(0, 8)) + '</span>'
            + '</div>'
            + '<div class="content">' + escapeHtml(item.content) + '</div>'
            + (hasSource
              ? '<div class="source">\ud83d\udcc4 '
                + (item.page_title ? escapeHtml(item.page_title) : '')
                + (item.page_url ? ' \u2014 <a href="' + escapeAttr(item.page_url) + '" target="_blank" rel="noopener">' + escapeHtml(item.page_url) + '</a>' : '')
                + '</div>'
              : '')
            + '</div>';
        });
        html += '</div>';
        listEl.innerHTML = html;
      }

      function formatTime(iso) {
        if (!iso) return '\u2014';
        try {
          var d = new Date(iso);
          var now = new Date();
          var diff = now - d;
          var mins = Math.floor(diff / 60000);
          var hours = Math.floor(diff / 3600000);
          var days = Math.floor(diff / 86400000);

          if (mins < 1) return '\u521a\u521a';
          if (mins < 60) return mins + ' \u5206\u949f\u524d';
          if (hours < 24) return hours + ' \u5c0f\u65f6\u524d';
          if (days < 7) return days + ' \u5929\u524d';

          return d.getFullYear() + '-'
            + String(d.getMonth() + 1).padStart(2, '0') + '-'
            + String(d.getDate()).padStart(2, '0') + ' '
            + String(d.getHours()).padStart(2, '0') + ':'
            + String(d.getMinutes()).padStart(2, '0');
        } catch (e) {
          return iso;
        }
      }

      function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str || ''));
        return div.innerHTML;
      }

      function escapeAttr(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
          .replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      if (getToken()) {
        renderMain();
      } else {
        renderLogin();
      }
    })();
  </script>
</body>
</html>`;
}
