import { chromium } from 'playwright';

/** CI's first browser launch was hanging until the 30 minute job cap. Bound it. */
export function launchBoard() {
  return chromium.launch({
    headless: true,
    timeout: 20000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
}
