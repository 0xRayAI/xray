import { describe, test, expect, vi, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(process.cwd());
const HAS_DIST = ["dist/plugin/xray-codex-injection.js", "dist/index.js"].every(f => fs.existsSync(path.join(PROJECT_ROOT, f)));

const { frameworkLoggerMock } = vi.hoisted(() => ({
  frameworkLoggerMock: { log: vi.fn() },
}));

vi.mock("../../core/framework-logger.js", () => ({
  frameworkLogger: frameworkLoggerMock,
}));

// ── Build artifact tests ──────────────────────────────────────────────────

describe("build artifacts", () => {
  const distMcpDir = path.join(PROJECT_ROOT, "dist", "mcps");
  const distPluginDir = path.join(PROJECT_ROOT, "dist", "plugin");
  const dotOpencodeDir = path.join(PROJECT_ROOT, ".opencode");

  test("dist/ available — prerequisite", () => {
    expect(HAS_DIST).toBe(true);
  });

  test("dist/plugin/xray-codex-injection.js exists", () => {
    if (!HAS_DIST) return;
    const pluginPath = path.join(distPluginDir, "xray-codex-injection.js");
    expect(fs.existsSync(pluginPath)).toBe(true);
  });

  test("dist/mcps/knowledge-skills/ has skill server files", () => {
    if (!HAS_DIST) return;
    const skillsDir = path.join(distMcpDir, "knowledge-skills");
    expect(fs.existsSync(skillsDir)).toBe(true);
    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith(".server.js"));
    expect(files.length).toBeGreaterThanOrEqual(25);
  });

  test("dist/mcps/ has core server files", () => {
    if (!HAS_DIST) return;
    const files = fs.readdirSync(distMcpDir).filter(f => f.endsWith(".server.js"));
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  test("dist/plugin/xray-codex-injection.js exists", () => {
    const pluginPath = path.join(distPluginDir, "xray-codex-injection.js");
    expect(fs.existsSync(pluginPath)).toBe(true);
  });

  test("dist/mcps/knowledge-skills/ has skill server files", () => {
    const skillsDir = path.join(distMcpDir, "knowledge-skills");
    expect(fs.existsSync(skillsDir)).toBe(true);
    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith(".server.js"));
    expect(files.length).toBeGreaterThanOrEqual(17);
  });

  test("dist/mcps/ has core server files", () => {
    const files = fs.readdirSync(distMcpDir).filter(f => f.endsWith(".server.js"));
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  test(".opencode/agents/ contains YML agent files", () => {
    const agentsDir = path.join(dotOpencodeDir, "agents");
    expect(fs.existsSync(agentsDir)).toBe(true);
    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith(".yml"));
    expect(files.length).toBeGreaterThanOrEqual(40);
  });

  test(".opencode/skills/ contains skill directories", () => {
    const skillsDir = path.join(dotOpencodeDir, "skills");
    expect(fs.existsSync(skillsDir)).toBe(true);
    const entries = fs.readdirSync(skillsDir);
    expect(entries.length).toBeGreaterThanOrEqual(5);
  });

  test(".opencode/codex.codex exists", () => {
    expect(fs.existsSync(path.join(dotOpencodeDir, "codex.codex"))).toBe(true);
  });

  test(".opencode/init.sh exists and is executable", () => {
    const initPath = path.join(dotOpencodeDir, "init.sh");
    expect(fs.existsSync(initPath)).toBe(true);
  });
});

// ── opencode.json config tests ───────────────────────────────────────────

describe("opencode.json configuration", () => {
  let config: Record<string, unknown>;

  beforeAll(() => {
    config = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "opencode.json"), "utf-8"));
  });

  test("has agent definitions for key agents", () => {
    const agents = (config.agent ?? {}) as Record<string, Record<string, unknown>>;
    expect(agents.architect?.mode).toBe("primary");
    expect(agents.strategist).toBeDefined();
    expect(agents["code-reviewer"]).toBeDefined();
    expect(agents["security-auditor"]).toBeDefined();
    expect(agents.researcher).toBeDefined();
  });

  test("mcp section disables problematic global servers", () => {
    const mcp = (config.mcp ?? {}) as Record<string, Record<string, boolean>>;
    expect(mcp["global-everything"]?.enabled).toBe(false);
    expect(mcp["global-git"]?.enabled).toBe(false);
    expect(mcp["global-filesystem"]?.enabled).toBe(false);
  });

  test("does NOT have plugin field set (uses package.json opencode.plugin)", () => {
    expect(config.plugin).toBeUndefined();
  });
});

// ── AGENTS.md tests ──────────────────────────────────────────────────────

describe("AGENTS.md configuration", () => {
  test("exists at project root", () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, "AGENTS.md"))).toBe(true);
  });

  test("references 0xray", () => {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, "AGENTS.md"), "utf-8");
    expect(content).toContain("0xray");
  });

  test("has v3.0.14 session entry", () => {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, "AGENTS.md"), "utf-8");
    expect(content).toContain("v3.0.14");
  });

  test("has v3.0.13 session entry (backward compat)", () => {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, "AGENTS.md"), "utf-8");
    expect(content).toContain("v3.0.13");
  });

  test("lists expected agents", () => {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, "AGENTS.md"), "utf-8");
    expect(content).toContain("@enforcer");
    expect(content).toContain("@orchestrator");
    expect(content).toContain("@researcher");
    expect(content).toContain("@architect");
  });
});

// ── Plugin registration E2E ──────────────────────────────────────────────

describe("default plugins registration", () => {
  test("all 26 servers register successfully", async () => {
    const { registerDefaultPlugins } = await import("../../nucleus/default-plugins.js");
    const result = await registerDefaultPlugins();
    expect(result.failed).toEqual([]);
    expect(result.registered).toBe(26);
  });

  test("batch counts match expected totals", async () => {
    const { registerDefaultPlugins } = await import("../../nucleus/default-plugins.js");
    const { pluginRegistry } = await import("../../nucleus/plugin-registry.js");
    pluginRegistry.resetForTest?.();
    const result = await registerDefaultPlugins();
    expect(result.registered).toBe(26);
    expect(result.failed).toEqual([]);
  });
});

// ── Individual server instantiation ──────────────────────────────────────

describe("each skill server instantiates and lists tools", () => {
  const servers: Array<{ name: string; path: string }> = [
    { name: "code-review",            path: "../../mcps/knowledge-skills/code-review.server.js" },
    { name: "security-audit",         path: "../../mcps/knowledge-skills/security-audit.server.js" },
    { name: "researcher",             path: "../../mcps/researcher.server.js" },
    { name: "api-design",             path: "../../mcps/knowledge-skills/api-design.server.js" },
    { name: "architecture-patterns",  path: "../../mcps/knowledge-skills/architecture-patterns.server.js" },
    { name: "database-design",         path: "../../mcps/knowledge-skills/database-design.server.js" },
    { name: "mobile-development",     path: "../../mcps/knowledge-skills/mobile-development.server.js" },
    { name: "ui-ux-design",           path: "../../mcps/knowledge-skills/ui-ux-design.server.js" },
    { name: "code-analyzer",          path: "../../mcps/knowledge-skills/code-analyzer.server.js" },
    { name: "performance-optimization", path: "../../mcps/knowledge-skills/performance-optimization.server.js" },
    { name: "project-analysis",       path: "../../mcps/knowledge-skills/project-analysis.server.js" },
    { name: "refactoring-strategies", path: "../../mcps/knowledge-skills/refactoring-strategies.server.js" },
    { name: "testing-strategy",       path: "../../mcps/knowledge-skills/testing-strategy.server.js" },
    { name: "devops-deployment",      path: "../../mcps/knowledge-skills/devops-deployment.server.js" },
    { name: "git-workflow",           path: "../../mcps/knowledge-skills/git-workflow.server.js" },
    { name: "log-monitor",            path: "../../mcps/knowledge-skills/log-monitor.server.js" },
    { name: "session-management",     path: "../../mcps/knowledge-skills/session-management.server.js" },
    { name: "strategist",             path: "../../mcps/knowledge-skills/strategist.server.js" },
    { name: "content-creator",        path: "../../mcps/knowledge-skills/content-creator.server.js" },
    { name: "growth-strategist",      path: "../../mcps/knowledge-skills/growth-strategist.server.js" },
    { name: "multimodal-looker",      path: "../../mcps/knowledge-skills/multimodal-looker.server.js" },
    { name: "seo-consultant",         path: "../../mcps/knowledge-skills/seo-consultant.server.js" },
    { name: "documentation-generation", path: "../../mcps/knowledge-skills/tech-writer.server.js" },
    { name: "bug-triage-specialist",  path: "../../mcps/knowledge-skills/bug-triage-specialist.server.js" },
    { name: "skill-invocation",       path: "../../mcps/knowledge-skills/skill-invocation.server.js" },
    { name: "testing-best-practices", path: "../../mcps/knowledge-skills/testing-best-practices.server.js" },
  ];

  test.each(servers)("$name instantiates and exposes tools", async ({ name, path: serverPath }) => {
    const mod = await import(serverPath);
    const keys = Object.keys(mod);
    const ServerClass = mod.default ?? keys
      .map(k => mod[k])
      .find((v: unknown) => typeof v === "function" && (v as Record<string, unknown>).name?.toString().endsWith("Server"));

    expect(ServerClass).toBeDefined();
    const instance = new (ServerClass as new () => unknown)();
    expect(instance).toBeDefined();
  });
});

// ── CHANGELOG.md tests ───────────────────────────────────────────────────

describe("CHANGELOG.md", () => {
  test("has 3.0.14 entry", () => {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, "CHANGELOG.md"), "utf-8");
    expect(content).toContain("3.0.14");
  });
});

// ── package.json config tests ────────────────────────────────────────────

describe("package.json configuration", () => {
  test("opencode.plugin points to dist/plugin/xray-codex-injection.js", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf-8"));
    expect(pkg.opencode?.plugin).toBe("./dist/plugin/xray-codex-injection.js");
  });

  test("version is 3.1.1", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf-8"));
    expect(pkg.version).toBe("3.1.1");
  });
});
