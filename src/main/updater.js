'use strict';

/**
 * Update checker via GitHub Releases API (no telemetry, one GET request).
 */

const https = require('https');

const REPO = 'official-ids/NbOS-dev';

function fetchLatest() {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const req = https.get({
      host: 'api.github.com',
      path: '/repos/' + REPO + '/releases/latest',
      headers: {
        'User-Agent': 'NexKey-Updater',
        'Accept': 'application/vnd.github+json'
      },
      timeout: 8000
    }, (r) => {
      let d = '';
      r.on('data', (c) => { d += c; });
      r.on('end', () => {
        try {
          const j = JSON.parse(d);
          done(j && j.tag_name ? { tag: j.tag_name, url: j.html_url || null } : null);
        } catch (_) { done(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); done(null); });
    req.on('error', () => done(null));
  });
}

function cmpVer(a, b) {
  const p = (x) => String(x).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const A = p(a);
  const B = p(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const d = (A[i] || 0) - (B[i] || 0);
    if (d) return d;
  }
  return 0;
}

async function check(current) {
  const j = await fetchLatest();
  if (!j) return { ok: false, hasUpdate: false };
  return {
    ok: true,
    hasUpdate: cmpVer(j.tag, current) > 0,
    latest: String(j.tag).replace(/^v/i, ''),
    url: j.url
  };
}

module.exports = { check, cmpVer, REPO };
