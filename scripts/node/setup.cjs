#!/usr/bin/env node

/**
 * StrRay Plugin Setup Script
 *
 * Configures OpenCode to use the StrRay plugin.
 * Run this after installing the plugin.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

function getOhMyOpenCodeConfigPath() {
  // Try to find OpenCode config in current project
  const projectConfig = path.join(
    process.cwd(),
    ".opencode",
    "OpenCode.json",
  );
  if (fs.existsSync(projectConfig)) {
    return projectConfig;
  }

  // Try to find global OpenCode config
  const homeDir = os.homedir();
  const globalConfig = path.join(
    homeDir,
    ".config",
    "opencode",
    "opencode.json",
  );
  if (fs.existsSync(globalConfig)) {
    return globalConfig;
  }

  // Create project-level config if neither exists
  return projectConfig;
}

function loadConfig(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(
      `Warning: Could not load config from ${configPath}:`,
      error.message,
    );
  }
  return {};
}

function saveConfig(configPath, config) {
  // Ensure directory exists
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function configureStrRayPlugin() {
  const configPath = getOhMyOpenCodeConfigPath();

  console.log(
    `🔧 Configuring StrRay plugin for OpenCode at: ${configPath}`,
  );

  let config = loadConfig(configPath);

  // Only add valid opencode configuration keys
  if (!config.model) {
    config.model = "openrouter/xai-grok-2-1212-fast-1";
  }

  // Add plugin to the plugin array
  if (!config.plugin) {
    config.plugin = [];
  }

  const pluginPath = "strray/dist/plugin/strray-codex-injection.js";

  if (!config.plugin.includes(pluginPath)) {
    config.plugin.push(pluginPath);
    console.log(`✅ Added StrRay plugin to configuration`);
  } else {
    console.log(`ℹ️ StrRay plugin already configured`);
  }

  // Add StrRay agent configurations (only valid opencode agent config)
  if (!config.agent) {
    config.agent = {};
  }

  const strrayAgents = {
    orchestrator: { model: "openrouter/xai-grok-2-1212-fast-1" },
    "enhanced-orchestrator": { model: "openrouter/xai-grok-2-1212-fast-1" },
    enforcer: { model: "openrouter/xai-grok-2-1212-fast-1" },
    architect: { model: "openrouter/xai-grok-2-1212-fast-1" },
    "test-architect": { model: "openrouter/xai-grok-2-1212-fast-1" },
    "bug-triage-specialist": { model: "openrouter/xai-grok-2-1212-fast-1" },
    "code-reviewer": { model: "openrouter/xai-grok-2-1212-fast-1" },
    "security-auditor": { model: "openrouter/xai-grok-2-1212-fast-1" },
    refactorer: { model: "openrouter/xai-grok-2-1212-fast-1" },
  };

  let agentsAdded = 0;
  for (const [agentName, agentConfig] of Object.entries(strrayAgents)) {
    if (!config.agent[agentName]) {
      config.agent[agentName] = agentConfig;
      agentsAdded++;
    }
  }

  if (agentsAdded > 0) {
    console.log(`✅ Added ${agentsAdded} StrRay agents to configuration`);
  }

  saveConfig(configPath, config);

  console.log(`🎉 StrRay plugin setup complete!`);
  console.log(`\n📋 Next Steps:`);
  console.log(`1. Restart OpenCode to load the plugin`);
  console.log(`2. Run 'opencode agent list' to see StrRay agents`);
  console.log(`3. Try '@enforcer analyze this code' to test the plugin`);
  console.log(
    `\n📖 Documentation: https://github.com/strray-framework/strray-plugin`,
  );
}

// Run the configuration
try {
  configureStrRayPlugin();
} catch (error) {
  console.error("❌ StrRay plugin setup failed:", error.message);
  console.log("\n🔧 Manual Configuration:");
  console.log("Add the following to your opencode.json (root directory):");
  console.log(`"plugin": "./node_modules/strray-ai/dist/plugin/strray-codex-injection.js"`);
  process.exit(1);
}
