#!/usr/bin/env node
/**
 * xAI OAuth PKCE setup — saves verifier to temp file so it survives aborts.
 *
 * Usage:
 *   node setup-xai-oauth.mjs              # prints URL, waits for callback
 *   node setup-xai-oauth.mjs <code>       # exchange previously gotten code
 *   node setup-xai-oauth.mjs daemon       # non-blocking: prints URL & exits,
 *                                         # child server handles callback + deploy
 */

import { randomBytes, createHash } from "node:crypto";
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fork } from "node:child_process";
import http from "node:http";

const PORT = 56121;
const HERMES_AUTH_PATH = join(homedir(), ".hermes", "auth.json");
const VERIFIER_PATH = join(tmpdir(), "xray-xai-oauth-verifier.txt");
const XAI_AUTH_URL = "https://auth.x.ai/oauth2/authorize";
const XAI_TOKEN_URL = "https://auth.x.ai/oauth2/token";
const XAI_CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828";
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;

function generateVerifier() {
  return randomBytes(32).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function challenge(verifier) {
  return createHash("sha256").update(verifier).digest()
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function printUrl(verifier) {
  const codeChallenge = challenge(verifier);
  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: XAI_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid profile email offline_access grok-cli:access api:access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state, nonce,
    plan: "generic",
    referrer: "hermes-agent",
  }).toString();

  console.log("\n========================================");
  console.log("  xAI OAuth Setup");
  console.log("========================================");
  console.log("\nOpen this URL in your browser:\n");
  console.log(`   ${XAI_AUTH_URL}?${params}\n`);
  console.log("Authorize → callback handled → token saved → Railway deployed.");
  console.log("You can close the browser tab when it says ✅ Authorized.\n");
}

async function startServer(verifier) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

      if (url.pathname === "/callback" && url.searchParams.has("code")) {
        const code = url.searchParams.get("code");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(wrapHtml("<h1>✅ Authorized!</h1><p>Token saved. Railway deploying. You can close this window.</p>"));
        try { unlinkSync(VERIFIER_PATH); } catch {}
        // Give response a moment to send, then close
        setTimeout(() => { server.close(); resolve(code); }, 100);
        return;
      }

      if (url.pathname === "/callback") {
        res.writeHead(400);
        res.end("Missing code parameter");
        return;
      }

      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(wrapHtml("<h1>404</h1><p>This server only handles xAI OAuth callbacks.</p>"));
    });

    server.listen(PORT, "127.0.0.1", () => {
      // Persist verifier so it survives script abort
      writeFileSync(VERIFIER_PATH, verifier, "utf-8");
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
      }
      reject(err);
    });
  });
}

function wrapHtml(body) {
  return `<html><head><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#e2e8f0;text-align:center}</style></head><body>${body}</body></html>`;
}

async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
    client_id: XAI_CLIENT_ID,
  });

  const response = await fetch(XAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  return response.json();
}

function saveToken(tokens) {
  const authData = {
    "xai-oauth": {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 86400),
      token_type: tokens.token_type || "Bearer",
      scope: tokens.scope || "openid profile email offline_access grok-cli:access api:access",
    },
  };

  mkdirSync(join(homedir(), ".hermes"), { recursive: true });
  writeFileSync(HERMES_AUTH_PATH, JSON.stringify(authData, null, 2));

  console.log(`\n✅ Token saved to ${HERMES_AUTH_PATH}`);
  console.log(`   Expires: ${new Date(Date.now() + (tokens.expires_in || 86400) * 1000).toISOString()}\n`);
  return authData;
}

async function deployToRailway() {
  const { execSync } = await import("node:child_process");
  const authContent = readFileSync(HERMES_AUTH_PATH, "utf-8");
  const base64 = Buffer.from(authContent).toString("base64");

  console.log("Setting Railway env var XRAY_HERMES_AUTH...");

  // Use Railway API to set the variable
  const projectId = execSync("railway project --json 2>/dev/null || echo ''", { encoding: "utf-8" }).trim();
  console.log("Project info:", projectId || "(no project info)");

  // We need to set the var via Railway env edit API or similar
  // For now, fall back to railway run with the var
  try {
    execSync(`railway env edit --json -v XRAY_HERMES_AUTH="${base64}" 2>/dev/null`, {
      stdio: "inherit",
      timeout: 15000,
    });
  } catch {
    // env edit might not support --json; try railway up instead
    console.log("Attempting deploy with implicit env...");
  }

  console.log("Deploying to Railway...");
  try {
    execSync("railway up --service governance", { stdio: "inherit", timeout: 120000 });
    console.log("\n✅ Deployed to Railway!");
  } catch (err) {
    console.error("\n⚠️  Deploy failed:", err.message);
    console.log("Token was saved locally. Deploy manually: railway up --service governance");
  }
}

// ── Daemon mode (non-blocking) ──────────────────────────────
async function daemonMain() {
  const verifier = generateVerifier();
  printUrl(verifier);

  try {
    const code = await startServer(verifier);
    try { unlinkSync(VERIFIER_PATH); } catch {}

    console.log("Exchanging code for tokens...");
    const tokens = await exchangeCode(code, verifier);
    saveToken(tokens);
    await deployToRailway();
  } catch (err) {
    console.error("\n❌ Failed:", err.message);
    try { unlinkSync(VERIFIER_PATH); } catch {}
    process.exit(1);
  }
}

// ── Interactive mode (blocking for code exchange) ────────────
async function interactiveMain() {
  const existingCode = process.argv[2];

  let verifier;
  if (existingCode) {
    verifier = readFileSync(VERIFIER_PATH, "utf-8").trim();
    console.log("Using saved verifier from", VERIFIER_PATH);
  } else {
    verifier = generateVerifier();
  }

  try {
    const code = existingCode || await startServer(verifier);
    try { unlinkSync(VERIFIER_PATH); } catch {}

    console.log("Exchanging code for tokens...");
    const tokens = await exchangeCode(code, verifier);
    saveToken(tokens);
  } catch (err) {
    console.error("\n❌ Setup failed:", err.message);
    process.exit(1);
  }
}

// ── Entry ────────────────────────────────────────────────────
const isDaemon = process.argv[2] === "daemon";

if (isDaemon) {
  // Fork a child process that runs the daemon so the parent can exit immediately
  const child = fork(process.argv[1], ["_daemon"], {
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    detached: true,
  });
  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));
  child.unref();
  // Give child a moment to start and print the URL
  setTimeout(() => process.exit(0), 500);
} else if (process.argv[2] === "_daemon") {
  daemonMain();
} else {
  interactiveMain();
}
