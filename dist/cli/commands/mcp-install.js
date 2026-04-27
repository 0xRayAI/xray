import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { getConfigDir } from "../../core/config-paths.js";
function getMCPConfigPath() {
    return join(process.cwd(), ".opencode", "strray", "mcp-registry.json");
}
function getBundledMCPRegistry() {
    const paths = [
        join(process.cwd(), "src", "mcps", "registry.json"),
        join(process.cwd(), "dist", "mcps", "registry.json"),
        join(process.cwd(), "node_modules", "strray-ai", "dist", "mcps", "registry.json"),
        join(process.cwd(), "node_modules", "strray-ai", "src", "mcps", "registry.json"),
    ];
    for (const p of paths) {
        if (existsSync(p)) {
            return JSON.parse(readFileSync(p, "utf-8"));
        }
    }
    return null;
}
function getMCPRegistry() {
    const bundled = getBundledMCPRegistry();
    const localPath = getMCPConfigPath();
    if (existsSync(localPath)) {
        const local = JSON.parse(readFileSync(localPath, "utf-8"));
        if (bundled) {
            const names = new Set(bundled.sources.map((s) => s.name));
            for (const s of local.sources) {
                if (!names.has(s.name))
                    bundled.sources.push(s);
            }
            return bundled;
        }
        return local;
    }
    return bundled ?? { sources: [] };
}
function findMCPSource(name) {
    return getMCPRegistry().sources.find((s) => s.name === name || s.url.includes(name));
}
function getInstalledMCPsPath() {
    const configDir = getConfigDir();
    return join(configDir, "installed-mcps.json");
}
function getInstalledMCPs() {
    const path = getInstalledMCPsPath();
    if (!existsSync(path))
        return {};
    try {
        return JSON.parse(readFileSync(path, "utf-8"));
    }
    catch {
        return {};
    }
}
function saveInstalledMCPs(mcps) {
    const path = getInstalledMCPsPath();
    const configDir = dirname(path);
    if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(path, JSON.stringify(mcps, null, 2), "utf-8");
}
function showHelp() {
    console.log(`
0xRay MCP Installer

Usage:
  npx strray-ai mcp:install <name>   Install an MCP server from registry
  npx strray-ai mcp:list           List available MCP servers
  npx strray-ai mcp:status        Show installed MCPs
  npx strray-ai mcp:remove <name> Remove an installed MCP

Examples:
  npx strray-ai mcp:install xmcp              # Install X (Twitter) MCP
  npx strray-ai mcp:install github-mcp      # Install GitHub MCP
  npx strray-ai mcp:list             # See all available
  npx strray-ai mcp:remove xmcp      # Remove X MCP

Environment Variables:
  Each MCP requires specific env vars. Check documentation at:
  https://github.com/0xRay-community/<name>
`);
}
function listMCPs() {
    const registry = getMCPRegistry();
    console.log("\n📦 Available Community MCPs:\n");
    console.log("| Name            | Category           | Description |");
    console.log("|----------------|-------------------|-------------|");
    for (const mcp of registry.sources) {
        const cat = mcp.category || "other";
        const desc = mcp.description?.slice(0, 30) || "-";
        console.log(`| ${mcp.name.padEnd(15)} | ${cat.padEnd(16)} | ${desc} |`);
    }
    console.log(`\nTotal: ${registry.sources.length} MCPs`);
    console.log("\nInstall: npx strray-ai mcp:install <name>");
}
function showStatus() {
    const installed = getInstalledMCPs();
    const keys = Object.keys(installed);
    if (keys.length === 0) {
        console.log("\n❌ No MCPs installed.\n");
        console.log("Run: npx strray-ai mcp:list to see available MCPs\n");
        return;
    }
    console.log("\n✅ Installed MCPs:\n");
    for (const [name, mcp] of Object.entries(installed)) {
        console.log(`  - ${name}: ${mcp.description || mcp.url}`);
    }
}
async function installMCP(name) {
    const source = findMCPSource(name);
    if (!source) {
        console.error(`\n❌ MCP "${name}" not found in registry.`);
        console.log("\nRun: npx strray-ai mcp:list to see available MCPs");
        process.exit(1);
    }
    const installed = getInstalledMCPs();
    if (installed[source.name]) {
        console.log(`\n⚠️  ${source.name} is already installed.`);
        console.log(`Run: npx strray-ai mcp:remove ${source.name} first`);
        process.exit(1);
    }
    console.log(`\n📦 Installing ${source.name}...`);
    console.log(`   Source: ${source.url}`);
    try {
        const installDir = join(process.cwd(), ".opencode", "mcps", source.name);
        if (!existsSync(dirname(installDir))) {
            mkdirSync(dirname(installDir), { recursive: true });
        }
        if (!existsSync(installDir)) {
            mkdirSync(installDir, { recursive: true });
        }
        execSync(`git clone ${source.url} "${installDir}"`, {
            stdio: "inherit",
        });
        installed[source.name] = source;
        saveInstalledMCPs(installed);
        console.log(`\n✅ ${source.name} installed successfully!`);
        console.log(`\n📝 Environment variables needed:`);
        if (source.env) {
            for (const env of source.env) {
                console.log(`   - ${env}`);
            }
        }
        console.log(`\n📁 Location: ${installDir}`);
        console.log(`\n─── SETUP INSTRUCTIONS ───`);
        console.log(`\n1. Configure environment variables:`);
        console.log(`   export ${source.env?.[0] || 'API_KEY'}=your_key_here`);
        console.log(`\n2. Add to your MCP client:\n`);
        if (source.name === 'xmcp') {
            console.log(`   Claude Desktop: Add to claude_desktop_config.json`);
            console.log(`   {"mcpServers":{"xmcp":{"command":"node","args":["${installDir}/dist/index.js"],"env":{"X_BEARER_TOKEN":"your_token"}}}`);
        }
        else if (source.name === 'github-mcp') {
            console.log(`   Add: {"mcpServers":{"github-mcp":{"command":"npx","args":["-y","@divyanshvn/github-mcp-server"],"env":{"GITHUB_TOKEN":"ghp_..."}}}`);
        }
        else if (source.name === 'discord-mcp') {
            console.log(`   Add: {"mcpServers":{"discord-mcp":{"command":"docker","args":["run","--rm","-i","-e","DISCORD_TOKEN=your_token","pasympa/discord-mcp"]}}`);
        }
        else {
            console.log(`   Claude Desktop: Edit ~/Library/Application\\ Support/Claude/claude_desktop_config.json`);
            console.log(`   Cursor: Edit ~/.cursor/mcp.json`);
        }
        console.log(`\n3. Start the MCP server:`);
        console.log(`   cd ${installDir} && npm install && npm start`);
        console.log(`\n4. Restart your MCP client to load the new server.`);
    }
    catch (error) {
        console.error(`\n❌ Failed to install ${source.name}:`, error);
        process.exit(1);
    }
}
function removeMCP(name) {
    const installed = getInstalledMCPs();
    if (!installed[name]) {
        console.error(`\n❌ ${name} is not installed.`);
        process.exit(1);
    }
    const installDir = join(process.cwd(), ".opencode", "mcps", name);
    if (existsSync(installDir)) {
        rmSync(installDir, { recursive: true, force: true });
    }
    delete installed[name];
    saveInstalledMCPs(installed);
    console.log(`\n✅ Removed ${name}`);
}
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    switch (command) {
        case "list":
            listMCPs();
            break;
        case "status":
        case undefined:
            showStatus();
            break;
        case "install":
        case undefined:
            const name = args[1];
            if (!name) {
                console.error("\nUsage: npx strray-ai mcp:install <name>");
                console.log("Run: npx strray-ai mcp:list to see available MCPs");
                process.exit(1);
            }
            await installMCP(name);
            break;
        case "remove":
            const removeName = args[1];
            if (!removeName) {
                console.error("\nUsage: npx strray-ai mcp:remove <name>");
                process.exit(1);
            }
            removeMCP(removeName);
            break;
        case "help":
        case "--help":
        case "-h":
            showHelp();
            break;
        default:
            console.error(`\nUnknown command: ${command}`);
            showHelp();
            process.exit(1);
    }
}
main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
// Export CLI entry points
export function listMCPsCommand() {
    listMCPs();
}
export function showMCPStatusCommand() {
    showStatus();
}
export async function installMCPCommand(name) {
    if (!name) {
        console.error("\nUsage: npx strray-ai mcp:install <name>");
        console.log("Run: npx strray-ai mcp:list to see available MCPs");
        process.exit(1);
    }
    await installMCP(name);
}
export function removeMCPCommand(name) {
    if (!name) {
        console.error("\nUsage: npx strray-ai mcp:remove <name>");
        process.exit(1);
    }
    removeMCP(name);
}
//# sourceMappingURL=mcp-install.js.map