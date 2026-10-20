// Theme colors live in one token block. The rest of the page names variables.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public', 'index.html');
const html = fs.readFileSync(PAGE, 'utf8');

function outsideTokens(src) {
  const start = src.indexOf('/* theme-tokens-start */');
  const end = src.indexOf('/* theme-tokens-end */');
  assert.ok(start >= 0 && end > start, 'theme token block is marked');
  return src.slice(0, start) + src.slice(end + '/* theme-tokens-end */'.length);
}

test('hex colors stay inside the theme token block', () => {
  const rest = outsideTokens(html).replace(/&#\d+;/g, '');
  const hex = rest.match(/#[0-9A-Fa-f]{3,8}\b/g) || [];
  assert.deepEqual(hex, []);
});

test('both themes, the toggle, and the self-hosted fonts are on the page', () => {
  assert.match(html, /prefers-color-scheme: light/);
  assert.match(html, /\[data-theme="light"\]/);
  assert.match(html, /\[data-theme="dark"\]/);
  assert.match(html, /bifrost-theme/);
  assert.match(html, /id="themeToggle"/);
  assert.match(html, /font-display: swap/);
  assert.match(html, /font-family: "Inter"/);
  assert.match(html, /font-family: "JetBrains Mono"/);
  assert.match(html, /inter-latin-400\.woff2/);
  assert.match(html, /jetbrains-mono-latin-400\.woff2/);
  for (const file of ['inter-latin-400.woff2', 'inter-latin-600.woff2', 'jetbrains-mono-latin-400.woff2']) {
    const font = path.join(path.dirname(PAGE), file);
    assert.ok(fs.statSync(font).size > 1000, file);
  }
});
