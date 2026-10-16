#!/usr/bin/env node
/**
 * Minimal static server for the Arch1 Playwright release-gate battery.
 * Serves one HTML page with a tiny script so chromium coverage has a target.
 */
const http = require('http');
const port = Number(process.env.PLAYWRIGHT_SMOKE_PORT || 3000);
const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>0xray release gate</title></head>
<body>
  <main id="gate">release-gate-ok</main>
  <script>
    window.__XRAY_RELEASE_GATE__ = function mark() {
      return document.getElementById('gate').textContent;
    };
    window.__XRAY_RELEASE_GATE__();
  </script>
</body>
</html>`;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`playwright-smoke-server listening on ${port}\n`);
});
