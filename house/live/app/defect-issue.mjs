// One defect, one issue. A log dump and a line that already names a number are not a defect.
// The suit hook uses the same rules before it posts. This module is what the board checks.

const NAMED = /[A-Za-z0-9][A-Za-z0-9._-]{0,38}\/[A-Za-z0-9_][A-Za-z0-9._-]{0,99}#\d+/;
const HASH = /(?:^|[\s(])#\d{2,}\b/;
const WORD = /\b(bug|defect)\b/i;
const REPO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,38}\/[A-Za-z0-9_][A-Za-z0-9._-]{0,99}$/;
const SEAT = /^[a-z0-9-]{2,16}$/;

export function defectDraft(text) {
  const src = String(text || '').replace(/\r/g, '');
  if (src.length < 20 || src.length > 1500) return null;
  const lines = src.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > 8) return null;
  if (!WORD.test(src)) return null;
  if (NAMED.test(src) || HASH.test(src)) return null;
  const title = lines[0].slice(0, 100);
  const norm = title.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!norm) return null;
  return { title, body: src.slice(0, 1500), mark: `defect:${norm}` };
}

export function defectIssue(draft, seat, repo) {
  if (!draft || typeof draft.title !== 'string' || typeof draft.body !== 'string') return null;
  if (!REPO.test(String(repo || ''))) return null;
  const who = String(seat || '').trim();
  if (!SEAT.test(who)) return null;
  const body = ['## Packet', '', `R: ${who}`, 'A: Blaze', '', draft.body.trim(), '', `— ${who}`, ''].join('\n');
  return { repo: String(repo), title: draft.title, body };
}

export function claimTitle(store, mark, now, ttl) {
  if (!store || typeof store !== 'object' || Array.isArray(store)) return false;
  const cur = store[mark];
  if (typeof cur === 'number' && cur > now) return false;
  store[mark] = now + ttl;
  return true;
}

export async function openGithubIssue(api, issue, token, fetchImpl) {
  if (!token) return { ok: false, reason: 'no-token' };
  if (!issue || !issue.repo || !issue.title || !issue.body) return { ok: false, reason: 'not a defect' };
  const root = String(api || 'https://api.github.com').replace(/\/$/, '');
  let res;
  try {
    res = await fetchImpl(`${root}/repos/${issue.repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'bifrost-defect',
      },
      body: JSON.stringify({ title: issue.title, body: issue.body }),
    });
  } catch {
    return { ok: false, reason: 'network' };
  }
  if (!res) return { ok: false, reason: 'network' };
  if (res.status === 201) {
    let data = {};
    try { data = await res.json(); } catch { data = {}; }
    return {
      ok: true,
      number: Number.isInteger(data.number) ? data.number : null,
      url: typeof data.html_url === 'string' ? data.html_url : '',
    };
  }
  try { await res.text(); } catch { /* the status is the reason */ }
  if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 422) {
    return { ok: false, reason: `github-${res.status}` };
  }
  return { ok: false, reason: `github-${res.status}` };
}
