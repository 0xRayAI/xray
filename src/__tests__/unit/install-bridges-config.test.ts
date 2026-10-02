import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pathToFileURL } from "node:url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  deployXrayConfig,
  resolveXrayConfigSource,
  XRAY_CONFIG_FILES,
  installGrokBridge,
  installHermesBridge,
  resetWearIo,
  readWearIo,
  installCursorBridge,
  mergeOpencodeJson,
  copyOpencodePlugin,
  parseExecDaemonCmdline,
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

  it("parses a local exec-daemon cmdline without needing the live process", () => {
    const parsed = parseExecDaemonCmdline([
      "node",
      "/exec-daemon/index.js",
      "--port",
      "26053",
      "--auth-token",
      "test-token",
    ]);
    expect(parsed).toEqual({ port: "26053", token: "test-token" });
    expect(parseExecDaemonCmdline(["node", "other.js", "--port", "1"])).toBeNull();
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

describe("install-bridges user-wins opencode merge and plugin shim", () => {
  it("merges agents per name so a user temperature is not replaced", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "xray-oc-src-"));
    const consumer = fs.mkdtempSync(path.join(os.tmpdir(), "xray-oc-user-"));
    const userFile = {
      $schema: "https://opencode.ai/config.json",
      agent: {
        architect: { description: "Architect", temperature: 0.2, mode: "primary" },
        strategist: { temperature: 1 },
        custom: { temperature: 0.4 },
      },
      mcp: {
        "xray-skills": {
          type: "local",
          command: ["npx", "-y", "0xray@4.0.27", "mcp", "skills"],
          enabled: false,
          environment: { L1_MARKER_ENV: "kept" },
        },
      },
      permission: { bash: "ask" },
      compaction: { auto: false, prune: true },
    };
    try {
      fs.writeFileSync(
        path.join(root, "opencode.json"),
        `${JSON.stringify({
          agent: {
            architect: { description: "Architect", temperature: 1, mode: "primary" },
            strategist: { temperature: 1 },
          },
          mcp: {
            "xray-skills": {
              type: "local",
              command: ["npx", "-y", "0xray", "mcp", "skills"],
              enabled: true,
            },
          },
          compaction: { auto: true, prune: true },
        })}\n`,
      );
      fs.writeFileSync(path.join(consumer, "opencode.json"), `${JSON.stringify(userFile, null, 2)}\n`);
      mergeOpencodeJson(consumer, root, () => undefined);
      const mergedRaw = fs.readFileSync(path.join(consumer, "opencode.json"), "utf8");
      const merged = JSON.parse(mergedRaw) as {
        agent: { architect: { temperature: number }; custom: { temperature: number }; strategist: { temperature: number } };
        mcp: {
          "xray-skills": {
            enabled: boolean;
            command: string[];
            environment: { L1_MARKER_ENV: string; XRAY_ROOT: string; PATH?: string; HOME?: string; NPM_TOKEN?: string };
          };
        };
        permission: { bash: string };
        compaction: { auto: boolean };
      };
      expect(merged.agent.architect.temperature).toBe(0.2);
      expect(merged.agent.custom.temperature).toBe(0.4);
      expect(merged.agent.strategist.temperature).toBe(1);
      expect(merged.mcp["xray-skills"].enabled).toBe(false);
      expect(merged.mcp["xray-skills"].command[0]).toBe("node");
      expect(merged.mcp["xray-skills"].command[1]).toMatch(/mcp-launch\.cjs$/);
      expect(merged.mcp["xray-skills"].command).toContain("0xray@4.0.27");
      expect(merged.mcp["xray-skills"].command).not.toContain("0xray");
      expect(merged.mcp["xray-skills"].command.join("\n")).not.toContain("L1_MARKER_ENV=kept");
      expect(merged.mcp["xray-skills"].environment.L1_MARKER_ENV).toBe("kept");
      expect(merged.mcp["xray-skills"].environment.XRAY_ROOT).toBe(consumer);
      expect(merged.mcp["xray-skills"].environment.PATH).toBeUndefined();
      expect(merged.mcp["xray-skills"].environment.NPM_TOKEN).toBeUndefined();
      expect(merged.permission.bash).toBe("ask");
      expect(merged.compaction.auto).toBe(false);
      mergeOpencodeJson(consumer, root, () => undefined);
      expect(fs.readFileSync(path.join(consumer, "opencode.json"), "utf8")).toBe(mergedRaw);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(consumer, { recursive: true, force: true });
    }
  });

  it("writes an OpenCode shim that re-exports the package dist plugin", () => {
    const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xray-shim-pkg-"));
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), "xray-shim-dest-"));
    const plugin = path.join(packageRoot, "dist", "plugin", "xray-codex-injection.js");
    fs.mkdirSync(path.dirname(plugin), { recursive: true });
    fs.writeFileSync(plugin, "export default function plugin(){ return { loaded: true }; }\n");
    try {
      copyOpencodePlugin(packageRoot, dest, () => undefined);
      const shimPath = path.join(dest, "plugin", "xray-codex-injection.js");
      const shim = fs.readFileSync(shimPath, "utf8");
      expect(shim).toBe(`export { default } from ${JSON.stringify(plugin)};\n`);
      expect(shim).not.toContain("plugin-logger");
      expect(JSON.parse(fs.readFileSync(path.join(dest, "package.json"), "utf8"))).toEqual({ type: "module" });
      const loaded = spawnSync(
        process.execPath,
        [
          "-e",
          "import(process.argv[1]).then((m) => { if (m.default().loaded !== true) process.exit(2); }).catch((e) => { console.error(e); process.exit(1); })",
          pathToFileURL(shimPath).href,
        ],
        { encoding: "utf8" },
      );
      expect(loaded.status, `${loaded.stdout}\n${loaded.stderr}`).toBe(0);
    } finally {
      fs.rmSync(packageRoot, { recursive: true, force: true });
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });
});

describe("repeat fasten", () => {
  const previousMachine = process.env.FOUNDRY_MACHINE_HOME;
  let machine = "";
  let consumer = "";

  beforeEach(() => {
    machine = fs.mkdtempSync(path.join(os.tmpdir(), "0xray-wear-machine-"));
    process.env.FOUNDRY_MACHINE_HOME = machine;
    consumer = fs.mkdtempSync(path.join(os.tmpdir(), "0xray-wear-consumer-"));
    fs.writeFileSync(
      path.join(consumer, "package.json"),
      `${JSON.stringify({ name: "acme", version: "1.0.0" })}\n`,
    );
  });

  afterEach(() => {
    if (previousMachine === undefined) delete process.env.FOUNDRY_MACHINE_HOME;
    else process.env.FOUNDRY_MACHINE_HOME = previousMachine;
    fs.rmSync(machine, { recursive: true, force: true });
    fs.rmSync(consumer, { recursive: true, force: true });
  });

  function snapshot(root: string): Map<string, Buffer> {
    const out = new Map<string, Buffer>();
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        const abs = path.join(dir, name);
        const st = fs.lstatSync(abs);
        const rel = path.relative(root, abs);
        if (st.isSymbolicLink()) out.set(rel, Buffer.from(`link:${fs.readlinkSync(abs)}`));
        else if (st.isDirectory()) walk(abs);
        else out.set(rel, fs.readFileSync(abs));
      }
    };
    walk(root);
    return out;
  }

  it("second fasten keeps file bytes and skips repeat writes", () => {
    const packageRoot = process.cwd();
    const hookPkg = fs.mkdtempSync(path.join(os.tmpdir(), "0xray-wear-hooks-"));
    const hooksDir = path.join(hookPkg, "src", "integrations", "cursor", "hooks");
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(
      path.join(hooksDir, "hooks.json"),
      `${JSON.stringify({ version: 1, hooks: { preToolUse: [{ command: ".cursor/hooks/pre-tool-use.sh" }] } })}\n`,
    );
    for (const name of CURSOR_HOOK_SCRIPTS) {
      fs.writeFileSync(path.join(hooksDir, name), `#!/bin/sh\necho ${name}\n`);
    }
    const { deployManagedAgents } = require("../../../scripts/node/postinstall.cjs") as {
      deployManagedAgents: (pkg: string, target: string, log: () => void) => void;
    };
    const wear = () => {
      deployXrayConfig(consumer, packageRoot, () => {});
      installGrokBridge(consumer, packageRoot, () => {}, {
        env: process.env,
        machineHome: machine,
      });
      installHermesBridge(consumer, packageRoot, () => {});
      installCursorBridge(consumer, hookPkg, () => {});
      deployManagedAgents(packageRoot, consumer, () => {});
    };
    try {
      resetWearIo();
      wear();
      expect(readWearIo().writes).toBeGreaterThan(0);
      const before = snapshot(consumer);
      const agentsStamp = fs.statSync(path.join(consumer, "AGENTS.md")).mtimeMs;

      resetWearIo();
      wear();
      const second = readWearIo();
      expect(second.writes).toBe(0);
      expect(second.skips).toBeGreaterThan(0);
      const after = snapshot(consumer);
      expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
      for (const [rel, bytes] of before) {
        expect(Buffer.compare(bytes, after.get(rel) as Buffer), rel).toBe(0);
      }
      expect(fs.statSync(path.join(consumer, "AGENTS.md")).mtimeMs).toBe(agentsStamp);

      const configPath = path.join(consumer, ".xray", "config.json");
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
      const removed = Object.keys(parsed)[0];
      const saved = parsed[removed];
      delete parsed[removed];
      fs.writeFileSync(configPath, JSON.stringify(parsed));
      resetWearIo();
      deployXrayConfig(consumer, packageRoot, () => {});
      const restored = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
      expect(restored[removed]).toEqual(saved);
      expect(readWearIo().writes).toBeGreaterThan(0);
    } finally {
      fs.rmSync(hookPkg, { recursive: true, force: true });
    }
  });
});
