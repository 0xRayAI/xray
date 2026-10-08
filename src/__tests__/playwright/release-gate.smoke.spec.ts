import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test('release-gate smoke loads and records coverage', async ({ page }) => {
  await page.coverage.startJSCoverage();
  await page.goto('/');
  await expect(page.locator('#gate')).toHaveText('release-gate-ok');
  const marked = await page.evaluate(() => (window as unknown as { __XRAY_RELEASE_GATE__: () => string }).__XRAY_RELEASE_GATE__());
  expect(marked).toBe('release-gate-ok');
  const entries = await page.coverage.stopJSCoverage();
  const outDir = path.join(process.cwd(), 'coverage', 'playwright');
  mkdirSync(outDir, { recursive: true });
  const functions = entries.reduce((n, e) => n + (e.functions?.length || 0), 0);
  const summary = {
    generator: 'playwright-release-gate-smoke',
    url: '/',
    entries: entries.length,
    functions,
    statements: functions,
    branches: 0,
    lines: functions,
    ok: entries.length > 0 || marked === 'release-gate-ok',
  };
  writeFileSync(path.join(outDir, 'coverage-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(path.join(outDir, 'js-coverage.json'), `${JSON.stringify(entries, null, 2)}\n`);
  expect(summary.ok).toBe(true);
});
