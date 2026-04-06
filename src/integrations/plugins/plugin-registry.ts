/**
 * Plugin Registry
 * 
 * Extends the existing IntegrationRegistry to manage plugins.
 * Plugins are integrations that can provide MCP servers and skills.
 * 
 * @version 1.0.0
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import { IntegrationRegistry } from "../base/registry.js";
import { PluginIntegration, type PluginManifest, type PluginRoutingMapping, type PluginType } from "./plugin-integration.js";

export interface PluginRegistryConfig {
  pluginsDir: string;
  configPath?: string;
  autoStart?: boolean;
}

/**
 * Plugin Registry
 * 
 * Manages plugins as integrations, leveraging:
 * - IntegrationRegistry for lifecycle management
 * - ServerConfigRegistry for MCP server registration
 * - Enforcer routing for skill mappings
 */
export class PluginRegistry extends EventEmitter {
  private pluginsDir: string;
  private configPath: string;
  private autoStart: boolean;
  private plugins: Map<string, PluginIntegration> = new Map();
  private integrationRegistry: IntegrationRegistry;
  private initialized: boolean = false;

  constructor(
    pluginsDir: string = ".strray/plugins",
    configPath: string = ".strray/config/plugin-config.json",
    autoStart: boolean = true
  ) {
    super();
    this.pluginsDir = pluginsDir;
    this.configPath = configPath;
    this.autoStart = autoStart;
    this.integrationRegistry = new IntegrationRegistry();
  }

  /**
   * Initialize and discover all plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.ensureDirectories();
    await this.discoverPlugins();
    this.initialized = true;

    frameworkLogger.log("plugin-registry", "initialized", "info", {
      pluginCount: this.plugins.size,
    });
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }

    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  /**
   * Discover and load plugins from plugins directory
   */
  private async discoverPlugins(): Promise<void> {
    if (!fs.existsSync(this.pluginsDir)) {
      return;
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = path.join(this.pluginsDir, entry.name, "plugin.yaml");

      if (fs.existsSync(manifestPath)) {
        await this.loadPlugin(entry.name);
      }
    }
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(name: string): Promise<PluginIntegration | null> {
    const pluginPath = path.join(this.pluginsDir, name);
    const manifestPath = path.join(pluginPath, "plugin.yaml");

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    try {
      const manifest = this.parseManifest(manifestPath);
      const plugin = new PluginIntegration(
        name,
        manifest.version,
        pluginPath,
        manifest.type
      );

      plugin.setAutoStart(this.autoStart);
      
      await plugin.initialize();
      
      this.plugins.set(name, plugin);
      
      frameworkLogger.log("plugin-registry", "plugin-loaded", "info", {
        name,
        type: manifest.type,
        version: manifest.version,
      });

      return plugin;
    } catch (error) {
      frameworkLogger.log("plugin-registry", "plugin-load-error", "error", {
        name,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Parse plugin.yaml manifest
   */
  private parseManifest(manifestPath: string): PluginManifest {
    const content = fs.readFileSync(manifestPath, "utf-8");
    const lines = content.split("\n");
    const result: Record<string, unknown> = {};
    let currentKey = "";
    const stack: { indent: number; obj: Record<string, unknown> }[] = [
      { indent: -1, obj: result },
    ];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const indent = line.search(/\S/);
      const isListItem = trimmed.startsWith("- ");

      if (isListItem) {
        const value = trimmed.slice(2).trim();
        const parent = stack[stack.length - 1].obj;
        if (!Array.isArray(parent[currentKey])) {
          parent[currentKey] = [];
        }
        (parent[currentKey] as unknown[]).push(value);
        continue;
      }

      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();

        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
          stack.pop();
        }

        const parent = stack[stack.length - 1].obj;

        if (value) {
          parent[key] = value;
        } else {
          parent[key] = {};
          stack.push({ indent, obj: parent[key] as Record<string, unknown> });
        }
        currentKey = key;
      }
    }

    return result as unknown as PluginManifest;
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): PluginIntegration | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginIntegration[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get active MCP server configurations
   */
  getMcpServerConfigs(): Array<{
    serverName: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    timeout?: number;
  }> {
    const configs: Array<{
      serverName: string;
      command: string;
      args?: string[];
      env?: Record<string, string>;
      timeout?: number;
    }> = [];

    for (const plugin of this.plugins.values()) {
      if (plugin.getPluginType() === "mcp-server") {
        const config = plugin.getMcpServerConfig();
        if (config) {
          configs.push(config);
        }
      }
    }

    return configs;
  }

  /**
   * Get all routing mappings from plugins
   */
  getAllRoutingMappings(): PluginRoutingMapping[] {
    const mappings: PluginRoutingMapping[] = [];

    for (const plugin of this.plugins.values()) {
      mappings.push(...plugin.getRoutingMappings());
    }

    return mappings;
  }

  /**
   * Get all tools from plugins
   */
  getAllTools(): Array<{ name: string; description: string; plugin: string }> {
    const tools: Array<{ name: string; description: string; plugin: string }> = [];

    for (const plugin of this.plugins.values()) {
      for (const tool of plugin.getTools()) {
        tools.push({
          name: tool.name,
          description: tool.description,
          plugin: plugin.name,
        });
      }
    }

    return tools;
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.shutdown();
    }
    this.plugins.clear();
    this.initialized = false;
  }

  /**
   * Get status summary
   */
  getStatus(): {
    initialized: boolean;
    pluginCount: number;
    plugins: Array<{ name: string; type: string; version: string; running: boolean }>;
  } {
    return {
      initialized: this.initialized,
      pluginCount: this.plugins.size,
      plugins: this.getAllPlugins().map((p) => ({
        name: p.name,
        type: p.getPluginType(),
        version: p.version,
        running: true,
      })),
    };
  }
}

import { frameworkLogger } from "../../core/framework-logger.js";
