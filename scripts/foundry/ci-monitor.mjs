#!/usr/bin/env node
/**
 * Mill CI monitor. Reports GitHub Actions for the milled cwd.
 * Not PPE. Not an auto-push bot.
 *
 *   npx @0xray/foundry ci [--commit SHA] [--report]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveMillRoot } from "./mill-root.mjs";

const args = process.argv.slice(2);
const commitIdx = args.indexOf("--commit");
const shaArg = commitIdx >= 0 ? args[commitIdx + 1] : "";
const sha = (shaArg && !shaArg.startsWith("-") ? shaArg : process.env.GITHUB_SHA || "").trim();
const root = resolveMillRoot();
const millReportPath = path.join(root, ".xray", "foundry-ci-report.json");
const shimReportPath = path.join(root, ".opencode", "logs", "ci-cd-monitor-report.json");

function writeReport(report) {
  const body = `${JSON.stringify(report, null, 2)}\n`;
  for (const reportPath of [millReportPath, shimReportPath]) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, body);
  }
}

function emptyReport(status, reason) {
  return {
    ci_status: status,
    health_score: status === "healthy" || status === "unknown" ? 100 : 0,
    issues: [],
    reason,
    sha: sha || null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const repo = process.env.GITHUB_REPOSITORY || "";
  if (!token || !repo.includes("/")) {
    const report = emptyReport(
      "unknown",
      "no GITHUB_TOKEN or GITHUB_REPOSITORY — mill CI monitor skipped",
    );
    writeReport(report);
    process.stdout.write("SUCCESS: mill CI monitor skipped (no GitHub token)\n");
    process.stdout.write("No failed jobs\n");
    return 0;
  }

  const url = new URL(`https://api.github.com/repos/${repo}/actions/runs`);
  url.searchParams.set("per_page", "50");
  if (sha) url.searchParams.set("head_sha", sha);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "0xray-foundry-ci-monitor",
    },
  });
  if (!res.ok) {
    const report = emptyReport("warning", `GitHub API ${res.status}`);
    writeReport(report);
    process.stderr.write(`mill ci: GitHub API ${res.status}\n`);
    return 1;
  }
  const body = await res.json();
  const runs = Array.isArray(body.workflow_runs) ? body.workflow_runs : [];
  const failed = runs.filter((run) => {
    const conclusion = String(run.conclusion || "");
    return conclusion === "failure" || conclusion === "timed_out" || conclusion === "startup_failure";
  });
  const issues = failed.map((run) => ({
    name: run.name || run.display_title || "workflow",
    conclusion: run.conclusion,
    html_url: run.html_url,
    head_sha: run.head_sha,
  }));
  const uniqueFails = new Set(issues.map((i) => i.name)).size;
  const health = Math.max(0, 100 - uniqueFails * 20);
  const ci_status = uniqueFails === 0 ? "healthy" : uniqueFails >= 3 ? "critical" : "warning";
  const report = {
    ci_status,
    health_score: health,
    issues,
    sha: sha || null,
    run_count: runs.length,
    generatedAt: new Date().toISOString(),
  };
  writeReport(report);

  if (uniqueFails === 0) {
    process.stdout.write("SUCCESS: All workflows passed\n");
    process.stdout.write("No failed jobs\n");
    return 0;
  }
  process.stdout.write(`FAILURE: ${issues.map((i) => i.name).join(", ")}\n`);
  return 1;
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    });
}

export { main };
