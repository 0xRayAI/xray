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
 * @version 1.1.0
 */
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
const PLUGINS_DIR = ".strray/plugins";
const CONFIG_PATH = ".strray/config/plugin-config.json";
export async function pluginListCommand() {
    console.log("\n📦 0xRay Plugins\n");
    console.log("═".repeat(60));
    if (!fs.existsSync(PLUGINS_DIR)) {
        console.log("No plugins installed.");
        console.log("Install a plugin: npx strray-ai plugin install <name>");
        return;
    }
    const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
    const plugins = [];
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const manifestPath = path.join(PLUGINS_DIR, entry.name, "plugin.yaml");
        if (fs.existsSync(manifestPath)) {
            const manifest = parseYaml(fs.readFileSync(manifestPath, "utf-8"));
            plugins.push({
                name: entry.name,
                type: manifest.type || "unknown",
                version: manifest.version || "0.0.0",
                enabled: true,
            });
        }
    }
    if (plugins.length === 0) {
        console.log("No plugins installed.");
    }
    else {
        for (const plugin of plugins) {
            console.log(`  ${plugin.enabled ? "✅" : "❌"} ${plugin.name}`);
            console.log(`     Type: ${plugin.type} | Version: ${plugin.version}`);
        }
    }
    console.log("\n" + "═".repeat(60));
    console.log(`\nTotal: ${plugins.length} plugin(s)`);
    console.log("\nInstall: npx strray-ai plugin install <name>");
    console.log("Details: npx strray-ai plugin status <name>\n");
}
export async function pluginInstallCommand(pluginName) {
    console.log(`\n📦 Installing plugin: ${pluginName}`);
    const pluginPath = path.join(PLUGINS_DIR, pluginName);
    if (fs.existsSync(pluginPath)) {
        console.log(`❌ Plugin already installed: ${pluginName}`);
        return;
    }
    // Try npm install first
    try {
        console.log(`🔍 Checking npm for: ${pluginName}`);
        // Check if package exists
        execSync(`npm view ${pluginName} name`, { stdio: "pipe" });
        console.log(`📥 Installing from npm: ${pluginName}`);
        execSync(`npm install --prefix "${PLUGINS_DIR}" ${pluginName}`, { stdio: "inherit" });
        const installedPath = path.join(PLUGINS_DIR, "node_modules", pluginName);
        if (fs.existsSync(installedPath)) {
            // Move to plugins dir
            fs.renameSync(installedPath, pluginPath);
            console.log(`✅ Installed from npm: ${pluginName}`);
        }
        else {
            console.log(`⚠️  Package installed but no plugin.yaml found`);
            console.log(`   You may need to create a plugin.yaml manifest`);
        }
        // Clean up node_modules
        const nodeModulesPath = path.join(PLUGINS_DIR, "node_modules");
        if (fs.existsSync(nodeModulesPath)) {
            fs.rmSync(nodeModulesPath, { recursive: true, force: true });
        }
        return;
    }
    catch {
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
    console.log("   3. Run: npx strray-ai plugin enable " + pluginName + "\n");
}
export async function pluginEnableCommand(pluginName) {
    console.log(`\n✅ Enabling plugin: ${pluginName}`);
    const pluginPath = path.join(PLUGINS_DIR, pluginName);
    const manifestPath = path.join(pluginPath, "plugin.yaml");
    if (!fs.existsSync(manifestPath)) {
        console.log(`❌ Plugin not found: ${pluginName}`);
        console.log(`   Install first: npx strray-ai plugin install ${pluginName}`);
        return;
    }
    console.log("ℹ️  To enable, add to config:");
    console.log(`   Edit: ${CONFIG_PATH}`);
    console.log(`   Add: "${pluginName}": { "enabled": true }\n`);
}
export async function pluginDisableCommand(pluginName) {
    console.log(`\n❌ Disabling plugin: ${pluginName}`);
    console.log(`   Edit: ${CONFIG_PATH}`);
    console.log(`   Set: "${pluginName}": { "enabled": false }\n`);
}
export async function pluginStatusCommand(pluginName) {
    console.log(`\n📋 Plugin Status: ${pluginName}\n`);
    console.log("═".repeat(50));
    const pluginPath = path.join(PLUGINS_DIR, pluginName);
    const manifestPath = path.join(pluginPath, "plugin.yaml");
    if (!fs.existsSync(manifestPath)) {
        console.log(`❌ Plugin not found: ${pluginName}`);
        return;
    }
    const manifest = parseYaml(fs.readFileSync(manifestPath, "utf-8"));
    const m = manifest;
    console.log(`  Name:        ${m.name}`);
    console.log(`  Version:     ${m.version}`);
    console.log(`  Type:        ${m.type}`);
    console.log(`  Description: ${m.description}`);
    console.log(`  License:     ${m.license || "N/A"}`);
    if (m.capabilities) {
        console.log("\n  Capabilities:");
        for (const cap of m.capabilities) {
            console.log(`    - ${cap}`);
        }
    }
    if (m.tools) {
        console.log("\n  Tools:");
        for (const tool of m.tools) {
            console.log(`    - ${tool.name}: ${tool.description}`);
        }
    }
    if (m.runtime) {
        const runtime = m.runtime;
        console.log("\n  Runtime:");
        console.log(`    Command: ${runtime.command}`);
        if (runtime.args) {
            console.log(`    Args:    ${runtime.args.join(" ")}`);
        }
    }
    console.log("\n" + "═".repeat(50) + "\n");
}
export async function pluginUninstallCommand(pluginName) {
    console.log(`\n🗑️  Uninstalling plugin: ${pluginName}`);
    const pluginPath = path.join(PLUGINS_DIR, pluginName);
    if (!fs.existsSync(pluginPath)) {
        console.log(`❌ Plugin not found: ${pluginName}`);
        return;
    }
    fs.rmSync(pluginPath, { recursive: true, force: true });
    console.log(`✅ Plugin removed: ${pluginName}\n`);
}
function parseYaml(content) {
    const lines = content.split("\n");
    const result = {};
    let currentKey = "";
    const stack = [
        { indent: -1, obj: result },
    ];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const indent = line.search(/\S/);
        const isListItem = trimmed.startsWith("- ");
        if (isListItem) {
            const value = trimmed.slice(2).trim();
            const top = stack[stack.length - 1];
            if (top && currentKey && !Array.isArray(top.obj[currentKey])) {
                top.obj[currentKey] = [];
            }
            if (top && currentKey) {
                top.obj[currentKey].push(value);
            }
            continue;
        }
        const colonIndex = trimmed.indexOf(":");
        if (colonIndex > 0) {
            const key = trimmed.slice(0, colonIndex).trim();
            const value = trimmed.slice(colonIndex + 1).trim();
            const top = stack[stack.length - 1];
            while (top && stack.length > 1 && indent <= top.indent) {
                stack.pop();
            }
            const current = stack[stack.length - 1];
            if (!current)
                continue;
            const parent = current.obj;
            if (value) {
                parent[key] = value;
            }
            else {
                parent[key] = {};
                stack.push({ indent, obj: parent[key] });
            }
            currentKey = key;
        }
    }
    return result;
}
//# sourceMappingURL=plugin-commands.js.map