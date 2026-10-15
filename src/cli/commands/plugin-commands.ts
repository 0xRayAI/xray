/**
 * Plugin CLI Commands
 * 
 * CLI commands for plugin management:
 * - plugin list
 * - plugin install (from npm or local)
 * - plugin enable
 * - plugin disable
 * - plugin status
 * - plugin uninstall
 * 
 */

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

const PLUGINS_DIR = ".xray/plugins";
const CONFIG_PATH = ".xray/config/plugin-config.json";

export async function pluginListCommand(): Promise<void> {
  console.log("\n📦 0xRay Plugins\n");
  console.log("═".repeat(60));

  if (!fs.existsSync(PLUGINS_DIR)) {
    console.log("No plugins installed.");
    console.log("Install a plugin: npx 0xray plugin install <name>");
    return;
  }

  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
  const plugins: Array<{ name: string; type: string; version: string; enabled: boolean }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const manifestPath = path.join(PLUGINS_DIR, entry.name, "plugin.yaml");
    if (fs.existsSync(manifestPath)) {
      const manifest = parseYaml(fs.readFileSync(manifestPath, "utf-8"));
      validateManifest(manifest);
      plugins.push({
        name: entry.name,
        type: (manifest as { type?: string }).type || "unknown",
        version: (manifest as { version?: string }).version || "0.0.0",
        enabled: true,
      });
    }
  }

  if (plugins.length === 0) {
    console.log("No plugins installed.");
  } else {
    for (const plugin of plugins) {
      console.log(`  ${plugin.enabled ? "✅" : "❌"} ${plugin.name}`);
      console.log(`     Type: ${plugin.type} | Version: ${plugin.version}`);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`\nTotal: ${plugins.length} plugin(s)`);
  console.log("\nInstall: npx 0xray plugin install <name>");
  console.log("Details: npx 0xray plugin status <name>\n");
}

export async function pluginInstallCommand(pluginName: string): Promise<void> {
  console.log(`\n📦 Installing plugin: ${pluginName}`);

  const pluginPath = path.join(PLUGINS_DIR, pluginName);

  if (fs.existsSync(pluginPath)) {
    console.log(`❌ Plugin already installed: ${pluginName}`);
    return;
  }

  if (!/^[a-zA-Z0-9@\/_.-]+$/.test(pluginName)) {
    console.log(`❌ Invalid plugin name: ${pluginName}`);
    return;
  }

  // Try npm install first
  try {
    console.log(`🔍 Checking npm for: ${pluginName}`);
    
    // Check if package exists
    const viewR = spawnSync('npm', ['view', pluginName, 'name'], { stdio: 'pipe' });
    if (viewR.status !== 0) throw new Error('npm view failed');
    
    console.log(`📥 Installing from npm: ${pluginName}`);
    const installR = spawnSync('npm', ['install', '--prefix', PLUGINS_DIR, pluginName], { stdio: 'inherit' });
    if (installR.status !== 0) throw new Error('npm install failed');
    
    const installedPath = path.join(PLUGINS_DIR, "node_modules", pluginName);
    if (fs.existsSync(installedPath)) {
      // Move to plugins dir
      fs.renameSync(installedPath, pluginPath);
      console.log(`✅ Installed from npm: ${pluginName}`);
    } else {
      console.log(`⚠️  Package installed but no plugin.yaml found`);
      console.log(`   You may need to create a plugin.yaml manifest`);
    }
    
    // Clean up node_modules
    const nodeModulesPath = path.join(PLUGINS_DIR, "node_modules");
    if (fs.existsSync(nodeModulesPath)) {
      fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    }
    
    return;
  } catch {
    // Not an npm package, try local installation
  }

  // Check if it's a local path
  if (fs.existsSync(pluginName)) {
    console.log(`📁 Installing from local path: ${pluginName}`);
    fs.cpSync(pluginName, pluginPath, { recursive: true });
    console.log(`✅ Installed from local: ${pluginName}`);
    return;
  }

  // Check if it's in examples
  const examplePath = path.join(process.cwd(), "examples", "plugins", pluginName);
  if (fs.existsSync(examplePath)) {
    console.log(`📁 Installing from examples: ${pluginName}`);
    fs.cpSync(examplePath, pluginPath, { recursive: true });
    console.log(`✅ Installed from examples: ${pluginName}`);
    return;
  }

  // Manual installation
  console.log("⚠️  Manual installation required.");
  console.log(`   1. Clone/create plugin to: ${pluginPath}`);
  console.log("   2. Add plugin.yaml manifest");
  console.log("   3. Run: npx 0xray plugin enable " + pluginName + "\n");
}

export async function pluginEnableCommand(pluginName: string): Promise<void> {
  console.log(`\n✅ Enabling plugin: ${pluginName}`);

  const pluginPath = path.join(PLUGINS_DIR, pluginName);
  const manifestPath = path.join(pluginPath, "plugin.yaml");

  if (!fs.existsSync(manifestPath)) {
    console.log(`❌ Plugin not found: ${pluginName}`);
    console.log(`   Install first: npx 0xray plugin install ${pluginName}`);
    return;
  }

  console.log("ℹ️  To enable, add to config:");
  console.log(`   Edit: ${CONFIG_PATH}`);
  console.log(`   Add: "${pluginName}": { "enabled": true }\n`);
}

export async function pluginDisableCommand(pluginName: string): Promise<void> {
  console.log(`\n❌ Disabling plugin: ${pluginName}`);
  console.log(`   Edit: ${CONFIG_PATH}`);
  console.log(`   Set: "${pluginName}": { "enabled": false }\n`);
}

export async function pluginStatusCommand(pluginName: string): Promise<void> {
  console.log(`\n📋 Plugin Status: ${pluginName}\n`);
  console.log("═".repeat(50));

  const pluginPath = path.join(PLUGINS_DIR, pluginName);
  const manifestPath = path.join(pluginPath, "plugin.yaml");

  if (!fs.existsSync(manifestPath)) {
    console.log(`❌ Plugin not found: ${pluginName}`);
    return;
  }

  const manifest = parseYaml(fs.readFileSync(manifestPath, "utf-8"));
  validateManifest(manifest);
  const m = manifest as Record<string, unknown>;

  console.log(`  Name:        ${m.name}`);
  console.log(`  Version:     ${m.version}`);
  console.log(`  Type:        ${m.type}`);
  console.log(`  Description: ${m.description}`);
  console.log(`  License:     ${m.license || "N/A"}`);

  if (Array.isArray(m.capabilities)) {
    console.log("\n  Capabilities:");
    for (const cap of m.capabilities) {
      console.log(`    - ${String(cap)}`);
    }
  }

  if (Array.isArray(m.tools)) {
    console.log("\n  Tools:");
    for (const tool of m.tools) {
      const row = tool as Record<string, unknown>;
      console.log(`    - ${String(row.name)}: ${String(row.description)}`);
    }
  }

  if (m.runtime && typeof m.runtime === "object" && !Array.isArray(m.runtime)) {
    const runtime = m.runtime as Record<string, unknown>;
    console.log("\n  Runtime:");
    console.log(`    Command: ${String(runtime.command)}`);
    if (Array.isArray(runtime.args)) {
      console.log(`    Args:    ${runtime.args.map((arg) => String(arg)).join(" ")}`);
    }
  }

  console.log("\n" + "═".repeat(50) + "\n");
}

export async function pluginUninstallCommand(pluginName: string): Promise<void> {
  console.log(`\n🗑️  Uninstalling plugin: ${pluginName}`);

  const pluginPath = path.join(PLUGINS_DIR, pluginName);

  if (!fs.existsSync(pluginPath)) {
    console.log(`❌ Plugin not found: ${pluginName}`);
    return;
  }

  fs.rmSync(pluginPath, { recursive: true, force: true });
  console.log(`✅ Plugin removed: ${pluginName}\n`);
}

function validateManifest(manifest: Record<string, unknown>): void {
  const runtime = manifest.runtime as Record<string, unknown> | undefined;
  if (runtime?.command && typeof runtime.command === 'string') {
    if (/[;&|`$(){}!<>]/.test(runtime.command)) {
      throw new Error(`Invalid runtime.command: contains shell metacharacters`);
    }
    if (runtime.command.includes('..')) {
      throw new Error(`Invalid runtime.command: path traversal detected`);
    }
  }
}

type YamlMap = Record<string, unknown>;
type YamlFrame = { indent: number; container: YamlMap | unknown[]; key?: string };

function parseScalar(raw: string): unknown {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => parseScalar(part));
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

/** Subset of YAML used by plugin.yaml: maps, scalar lists, and lists of maps. */
export function parseYaml(content: string): YamlMap {
  const root: YamlMap = {};
  const stack: YamlFrame[] = [{ indent: -1, container: root }];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indent = line.search(/\S/);

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    if (trimmed.startsWith("- ")) {
      let owner = stack[stack.length - 1];
      if (
        owner &&
        !Array.isArray(owner.container) &&
        Object.keys(owner.container).length === 0 &&
        stack.length > 1
      ) {
        const holder = stack[stack.length - 2];
        const emptyIndent = owner.indent;
        stack.pop();
        if (holder && !Array.isArray(holder.container) && holder.key) {
          const list: unknown[] = [];
          holder.container[holder.key] = list;
          stack.push({ indent: emptyIndent, container: list });
        }
        owner = stack[stack.length - 1];
      }
      if (!owner || !Array.isArray(owner.container)) continue;

      const rest = trimmed.slice(2).trim();
      const colon = rest.indexOf(":");
      const quoted = rest.startsWith('"') || rest.startsWith("'");
      if (!quoted && colon > 0) {
        const item: YamlMap = {};
        const key = rest.slice(0, colon).trim();
        const value = rest.slice(colon + 1).trim();
        item[key] = value ? parseScalar(value) : {};
        owner.container.push(item);
        stack.push({ indent, container: item, key });
      } else {
        owner.container.push(parseScalar(rest));
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex <= 0) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    const current = stack[stack.length - 1];
    if (!current || Array.isArray(current.container)) continue;

    if (value) {
      current.container[key] = parseScalar(value);
      current.key = key;
    } else {
      const child: YamlMap = {};
      current.container[key] = child;
      current.key = key;
      stack.push({ indent, container: child });
    }
  }

  return root;
}
