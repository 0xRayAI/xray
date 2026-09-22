import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  deployXrayConfig,
  resolveXrayConfigSource,
  XRAY_CONFIG_FILES,
  installCursorBridge,
  resolveCursorHooksTemplate,
  resolveCursorWorkspaceRoot,
  CURSOR_HOOK_SCRIPTS,
} = require("../../../scripts/node/install-bridges.cjs");

describe("install-bridges xray config deploy", () => {
  let tmpRoot: string;
  let packageRoot: string;
  let consumerRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "0xray-config-deploy-"));
    packageRoot = path.join(tmpRoot, "package");
    consumerRoot = path.join(tmpRoot, "consumer");
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.mkdirSync(consumerRoot, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("resolves config from xray/ when .xray/ is absent", () => {
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({ memory_routing: { enabled: true, provider: "repertoire" } }),
    );

    const resolved = resolveXrayConfigSource(packageRoot, "features.json");
    expect(resolved).toBe(path.join(xrayDir, "features.json"));
  });

  it("merges features.json on upgrade — preserves consumer opt-ins, bumps version", () => {
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name: "0xray", version: "3.4.5" }),
    );
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({
        version: "3.4.3",
        memory_routing: { enabled: false, provider: "null" },
        inference_governance: { enabled: false },
        new_framework_block: { enabled: true },
      }),
    );

    const consumerXray = path.join(consumerRoot, ".xray");
    fs.mkdirSync(consumerXray, { recursive: true });
    fs.writeFileSync(
      path.join(consumerXray, "features.json"),
      JSON.stringify({
        version: "3.4.1",
        memory_routing: {
          enabled: true,
          provider: "repertoire",
          module_path: "dist/provider/memory-routing-provider.js",
        },
        inference_governance: { enabled: true },
      }),
    );

    deployXrayConfig(consumerRoot, packageRoot, () => {});

    const deployed = JSON.parse(
      fs.readFileSync(path.join(consumerXray, "features.json"), "utf-8"),
    );
    expect(deployed.version).toBe("3.4.5");
    expect(deployed.memory_routing?.enabled).toBe(true);
    expect(deployed.memory_routing?.provider).toBe("repertoire");
    expect(deployed.inference_governance?.enabled).toBe(true);
    expect(deployed.new_framework_block?.enabled).toBe(true);
  });

  it("upgrade without suit_temperament pins profile guided (does not auto-frontier Grok)", () => {
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name: "0xray", version: "4.0.0" }),
    );
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({
        version: "4.0.0",
        suit_temperament: { profile: "auto" },
        multi_agent_orchestration: { lead_dev_mode: true },
      }),
    );

    const consumerXray = path.join(consumerRoot, ".xray");
    fs.mkdirSync(consumerXray, { recursive: true });
    fs.writeFileSync(
      path.join(consumerXray, "features.json"),
      JSON.stringify({
        version: "3.5.5",
        multi_agent_orchestration: { lead_dev_mode: true },
      }),
    );

    deployXrayConfig(consumerRoot, packageRoot, () => {});
    const deployed = JSON.parse(
      fs.readFileSync(path.join(consumerXray, "features.json"), "utf-8"),
    );
    expect(deployed.suit_temperament?.profile).toBe("guided");
  });

  it("fresh features.json keeps shipped auto profile", () => {
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({
        suit_temperament: { profile: "auto" },
      }),
    );
    deployXrayConfig(consumerRoot, packageRoot, () => {});
    const deployed = JSON.parse(
      fs.readFileSync(path.join(consumerRoot, ".xray", "features.json"), "utf-8"),
    );
    expect(deployed.suit_temperament?.profile).toBe("auto");
  });

  it("merges codex.json — adds new shipped terms without dropping consumer file", () => {
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(xrayDir, "codex.json"),
      JSON.stringify({ terms: { "69": { rule: "no new surface" }, "70": { rule: "future" } } }),
    );

    const consumerXray = path.join(consumerRoot, ".xray");
    fs.mkdirSync(consumerXray, { recursive: true });
    fs.writeFileSync(
      path.join(consumerXray, "codex.json"),
      JSON.stringify({ terms: { "11": { rule: "no any" } } }),
    );

    deployXrayConfig(consumerRoot, packageRoot, () => {});

    const deployed = JSON.parse(
      fs.readFileSync(path.join(consumerXray, "codex.json"), "utf-8"),
    );
    expect(deployed.terms?.["11"]?.rule).toBe("no any");
    expect(deployed.terms?.["69"]?.rule).toBe("no new surface");
    expect(deployed.terms?.["70"]?.rule).toBe("future");
  });

  it("deploys features.json and schema from xray/ to consumer .xray/", () => {
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({
        memory_routing: { enabled: true, provider: "repertoire" },
      }),
    );
    fs.writeFileSync(path.join(xrayDir, "features.schema.json"), "{}");

    const copied = deployXrayConfig(consumerRoot, packageRoot, () => {});
    expect(copied).toBe(2);

    const deployed = JSON.parse(
      fs.readFileSync(path.join(consumerRoot, ".xray", "features.json"), "utf-8"),
    );
    expect(deployed.memory_routing?.provider).toBe("repertoire");
    expect(fs.existsSync(path.join(consumerRoot, ".xray", "features.schema.json"))).toBe(true);
  });

  function plantRepertoireSibling(parentDir: string) {
    const root = path.join(parentDir, "repertoire");
    fs.mkdirSync(path.join(root, "dist", "provider"), { recursive: true });
    fs.mkdirSync(path.join(root, "data"), { recursive: true });
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "@0xray/repertoire" }));
    fs.writeFileSync(path.join(root, "dist", "provider", "memory-routing-provider.js"), "export {}\n");
    fs.writeFileSync(
      path.join(root, "data", "curated_signals.json"),
      JSON.stringify({ signals: [{ name: "station-resume" }] }),
    );
    return root;
  }

  it("fresh features.json stays memory_routing off without Repertoire", () => {
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({
        memory_routing: { enabled: false, provider: "null", module_path: "", config: {} },
      }),
    );
    deployXrayConfig(consumerRoot, packageRoot, () => {});
    const deployed = JSON.parse(
      fs.readFileSync(path.join(consumerRoot, ".xray", "features.json"), "utf-8"),
    );
    expect(deployed.memory_routing?.enabled).toBe(false);
    expect(deployed.memory_routing?.provider).toBe("null");
  });

  it("fresh features.json enables Repertoire when sibling module resolves", () => {
    plantRepertoireSibling(tmpRoot);
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({
        memory_routing: { enabled: false, provider: "null", module_path: "", config: {} },
      }),
    );
    deployXrayConfig(consumerRoot, packageRoot, () => {});
    const deployed = JSON.parse(
      fs.readFileSync(path.join(consumerRoot, ".xray", "features.json"), "utf-8"),
    );
    expect(deployed.memory_routing?.enabled).toBe(true);
    expect(deployed.memory_routing?.provider).toBe("repertoire");
    expect(deployed.memory_routing?.module_path).toBe(
      "../repertoire/dist/provider/memory-routing-provider.js",
    );
  });

  it("upgrade leftover default-off enables when Repertoire resolves", () => {
    plantRepertoireSibling(tmpRoot);
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({ name: "0xray", version: "4.0.0" }));
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({
        version: "4.0.0",
        memory_routing: { enabled: false, provider: "null" },
      }),
    );
    const consumerXray = path.join(consumerRoot, ".xray");
    fs.mkdirSync(consumerXray, { recursive: true });
    fs.writeFileSync(
      path.join(consumerXray, "features.json"),
      JSON.stringify({
        version: "3.5.5",
        memory_routing: { enabled: false, provider: "null" },
      }),
    );
    deployXrayConfig(consumerRoot, packageRoot, () => {});
    const deployed = JSON.parse(fs.readFileSync(path.join(consumerXray, "features.json"), "utf-8"));
    expect(deployed.memory_routing?.enabled).toBe(true);
    expect(deployed.memory_routing?.provider).toBe("repertoire");
  });

  it("explicit opt-out stays off even when Repertoire resolves", () => {
    plantRepertoireSibling(tmpRoot);
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({ memory_routing: { enabled: false, provider: "null" } }),
    );
    const consumerXray = path.join(consumerRoot, ".xray");
    fs.mkdirSync(consumerXray, { recursive: true });
    fs.writeFileSync(
      path.join(consumerXray, "features.json"),
      JSON.stringify({ memory_routing: { enabled: false, provider: "repertoire" } }),
    );
    deployXrayConfig(consumerRoot, packageRoot, () => {});
    const deployed = JSON.parse(fs.readFileSync(path.join(consumerXray, "features.json"), "utf-8"));
    expect(deployed.memory_routing?.enabled).toBe(false);
    expect(deployed.memory_routing?.provider).toBe("repertoire");
  });

  it("package.json files array ships features config artifacts", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"),
    );
    const files: string[] = pkg.files ?? [];
    for (const rel of [
      "xray/features.json",
      "xray/features.schema.json",
      ".xray/features.json",
      ".xray/features.schema.json",
    ]) {
      expect(files).toContain(rel);
    }
    expect(XRAY_CONFIG_FILES).toContain("features.json");
    expect(XRAY_CONFIG_FILES).toContain("features.schema.json");
  });
});

describe("install-bridges cursor wear", () => {
  let tmpRoot: string;
  let packageRoot: string;
  let consumerRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "0xray-cursor-wear-"));
    packageRoot = path.join(tmpRoot, "package");
    consumerRoot = path.join(tmpRoot, "consumer");
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.mkdirSync(consumerRoot, { recursive: true });
    const hooksDir = path.join(packageRoot, "src", "integrations", "cursor", "hooks");
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(
      path.join(hooksDir, "hooks.json"),
      JSON.stringify({
        version: 1,
        hooks: { preToolUse: [{ command: ".cursor/hooks/pre-tool-use.sh" }] },
      }),
    );
    for (const name of CURSOR_HOOK_SCRIPTS) {
      fs.writeFileSync(path.join(hooksDir, name), `#!/bin/sh\necho ${name}\n`);
    }
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("fastens .cursor/hooks.json from the package template", () => {
    const dest = installCursorBridge(consumerRoot, packageRoot, () => {});
    expect(dest).toBe(path.join(consumerRoot, ".cursor", "hooks.json"));
    expect(fs.existsSync(dest)).toBe(true);
    const fastened = JSON.parse(fs.readFileSync(dest, "utf-8"));
    expect(fastened.version).toBe(1);
    expect(fastened.hooks.preToolUse).toHaveLength(1);
  });

  it("rewrites leftover env-assignment hooks.json to relative sh and copies scripts", () => {
    const destDir = path.join(consumerRoot, ".cursor");
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, "hooks.json");
    fs.writeFileSync(
      dest,
      JSON.stringify({
        version: 1,
        hooks: {
          preToolUse: [
            {
              command:
                'XRAY_AI_PATH="${XRAY_AI_PATH:-../xray}" node "${XRAY_AI_PATH:-../xray}/src/integrations/cursor/hooks/pre-tool-use.js"',
            },
          ],
        },
      }),
    );
    installCursorBridge(consumerRoot, packageRoot, () => {});
    const rewritten = JSON.parse(fs.readFileSync(dest, "utf-8"));
    expect(rewritten.hooks.preToolUse[0].command).toBe(".cursor/hooks/pre-tool-use.sh");
    expect(rewritten.hooks.preCompact[0].command).toBe(".cursor/hooks/pre-compact.sh");
    expect(rewritten.hooks.beforeReadFile[0].command).toBe(".cursor/hooks/before-read-file.sh");
    expect(fs.existsSync(path.join(destDir, "hooks", "xray-cloud-hook.sh"))).toBe(true);
    expect(fs.existsSync(path.join(destDir, "hooks", "pre-tool-use.sh"))).toBe(true);
  });

  it("keeps extra events on an already-relative hooks.json", () => {
    const destDir = path.join(consumerRoot, ".cursor");
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, "hooks.json");
    fs.writeFileSync(
      dest,
      JSON.stringify({
        version: 1,
        hooks: {
          preToolUse: [{ command: ".cursor/hooks/pre-tool-use.sh" }],
          preCompact: [{ command: ".cursor/hooks/pre-compact.sh" }],
          afterFileEdit: [{ command: ".cursor/hooks/after-file-edit.sh" }],
          keep: [{ command: ".cursor/hooks/pre-tool-use.sh" }],
        },
      }),
    );
    installCursorBridge(consumerRoot, packageRoot, () => {});
    const kept = JSON.parse(fs.readFileSync(dest, "utf-8"));
    expect(kept.hooks.keep[0].command).toBe(".cursor/hooks/pre-tool-use.sh");
    expect(kept.hooks.beforeShellExecution[0].command).toBe(".cursor/hooks/before-shell-execution.sh");
  });

  it("resolves the shipped cursor hooks template from this package", () => {
    const real = resolveCursorHooksTemplate(process.cwd());
    expect(real).toBeTruthy();
    expect(fs.existsSync(real as string)).toBe(true);
  });

  it("fastens the multi-repo Cloud workspace root as well as the consumer checkout", () => {
    const workspace = path.join(tmpRoot, "agent");
    const repos = path.join(workspace, "repos");
    const mill = path.join(repos, "xray");
    const consumer = path.join(repos, "repertoire");
    fs.mkdirSync(mill, { recursive: true });
    fs.mkdirSync(consumer, { recursive: true });
    expect(resolveCursorWorkspaceRoot(consumer)).toBe(workspace);
    const dest = installCursorBridge(consumer, packageRoot, () => {});
    expect(dest).toBe(path.join(consumer, ".cursor", "hooks.json"));
    expect(fs.existsSync(path.join(workspace, ".cursor", "hooks", "pre-tool-use.sh"))).toBe(true);
    const workspaceHooks = JSON.parse(
      fs.readFileSync(path.join(workspace, ".cursor", "hooks.json"), "utf-8"),
    );
    expect(workspaceHooks.hooks.preToolUse[0].command).toBe(".cursor/hooks/pre-tool-use.sh");
  });

  it("consumer template commands are relative cloud-safe sh and JS still exists as src build input", () => {
    const real = resolveCursorHooksTemplate(process.cwd());
    const hooks = JSON.parse(fs.readFileSync(real as string, "utf-8")) as {
      hooks: Record<string, Array<{ command: string }>>;
    };
    for (const cmd of Object.values(hooks.hooks).flat().map((h) => h.command)) {
      expect(cmd).toMatch(/^\.cursor\/hooks\/[\w.-]+\.sh$/);
      expect(cmd).not.toMatch(/XRAY_AI_PATH=/);
      expect(cmd).not.toContain("dist/integrations/cursor/hooks/");
    }
    for (const name of [
      "hooks.json",
      "pre-tool-use.js",
      "pre-compact.js",
      "after-file-edit.js",
      "cursor-hook-utils.js",
      "cursor-usage-receipt.js",
      "xray-cloud-hook.sh",
      "pre-tool-use.sh",
    ]) {
      expect(fs.existsSync(path.join(process.cwd(), "src", "integrations", "cursor", "hooks", name))).toBe(
        true,
      );
    }
  });
});