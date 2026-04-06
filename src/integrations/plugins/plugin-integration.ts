/**
 * Plugin Integration
 * 
 * Plugin system extending the existing Integration architecture.
 * Plugins are integrations that can provide MCP servers, skills, and capabilities.
 * 
 * Integrates with:
 * - BaseIntegration (lifecycle management)
 * - IntegrationRegistry (plugin management)
 * - ServerConfigRegistry (MCP server registration)
 * - Enforcer routing (skill mappings)
 * 
 * @version 1.0.0
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import { spawn, type ChildProcess } from "child_process";
import {
  BaseIntegration,
  type IntegrationConfig,
  type HealthResult,
  type IntegrationStats,
} from "../base/index.js";
import { frameworkLogger } from "../../core/framework-logger.js";

/**
 * Plugin types matching the plugin architecture spec
 */
export enum PluginType {
  MCP_SERVER = "mcp-server",
  SKILL = "skill",
  INTEGRATION = "integration",
  AGENT = "agent",
}

/**
 * Plugin lifecycle states
 */
export enum PluginState {
  UNINSTALLED = "uninstalled",
  INSTALLED = "installed",
  ENABLED = "enabled",
  ACTIVE = "active",
}

/**
 * Plugin configuration
 */
export interface PluginConfig extends IntegrationConfig {
  type: PluginType;
  autoStart: boolean;
  config?: Record<string, unknown>;
}

/**
 * Plugin manifest (from plugin.yaml)
 */
export interface PluginManifest {
  name: string;
  version: string;
  type: PluginType;
  description: string;
  license?: string;
  runtime?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    timeout?: number;
  };
  tools?: Array<{
    name: string;
    description: string;
    inputSchema?: object;
  }>;
  capabilities?: string[];
  dependencies?: Record<string, string>;
}

/**
 * Plugin routing mapping for enforcer
 */
export interface PluginRoutingMapping {
  keywords: string[];
  skill: string;
  agent: string;
  confidence: number;
}

/**
 * Default plugin configuration
 */
export const DEFAULT_PLUGIN_CONFIG: PluginConfig = {
  enabled: false,
  debug: false,
  logLevel: "info",
  type: PluginType.MCP_SERVER,
  autoStart: true,
};

/**
 * Plugin Integration Class
 * 
 * Extends BaseIntegration to leverage existing:
 * - Lifecycle management (initialize/shutdown)
 * - Configuration handling
 * - Event emission
 * - Health checking
 * - Logging
 */
export class PluginIntegration extends BaseIntegration {
  private manifest: PluginManifest | null = null;
  private process: ChildProcess | null = null;
  private pluginPath: string = "";
  private pluginType: PluginType = PluginType.MCP_SERVER;
  private autoStart: boolean = true;

  constructor(
    name: string,
    version: string,
    pluginPath: string,
    type: PluginType = PluginType.MCP_SERVER
  ) {
    super(name, version, { enabled: true, debug: false, logLevel: "info" });
    this.pluginPath = pluginPath;
    this.pluginType = type;
  }

  /**
   * Load plugin from plugin.yaml
   */
  async load(): Promise<void> {
    const manifestPath = path.join(this.pluginPath, "plugin.yaml");
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Plugin manifest not found: ${manifestPath}`);
    }

    this.manifest = this.parseManifest(manifestPath);
    
    frameworkLogger.log(
      "plugin-integration",
      "loaded",
      "info",
      {
        name: this.name,
        version: this.manifest.version,
        type: this.manifest.type,
      }
    );
  }

  /**
   * Parse YAML manifest
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
   * Initialize the plugin
   */
  protected async performInitialization(): Promise<void> {
    if (!this.manifest) {
      await this.load();
    }

    if (this.config.enabled && this.autoStart) {
      await this.startPlugin();
    }
  }

  /**
   * Shutdown the plugin
   */
  protected async performShutdown(): Promise<void> {
    await this.stopPlugin();
  }

  /**
   * Health check implementation
   */
  protected async performHealthCheck(): Promise<HealthResult> {
    if (!this.process || this.process.killed) {
      return {
        healthy: false,
        message: `Plugin ${this.name} process not running`,
      };
    }

    return {
      healthy: true,
      message: `Plugin ${this.name} is running`,
      details: {
        pid: this.process.pid,
        type: this.pluginType,
      },
    };
  }

  /**
   * Start the MCP server process
   */
  async startPlugin(): Promise<void> {
    if (!this.manifest?.runtime) {
      return;
    }

    const { command, args, env } = this.manifest.runtime;

    this.process = spawn(command, args || [], {
      env: { ...process.env, ...env },
      stdio: "pipe",
    });

    this.process.on("error", (err) => {
      frameworkLogger.log(
        "plugin-integration",
        "process-error",
        "error",
        { name: this.name, error: err.message }
      );
    });

    this.process.on("exit", (code) => {
      frameworkLogger.log(
        "plugin-integration",
        "process-exit",
        "info",
        { name: this.name, code }
      );
    });

    frameworkLogger.log(
      "plugin-integration",
      "started",
      "info",
      { name: this.name, pid: this.process.pid }
    );
  }

  /**
   * Stop the MCP server process
   */
  async stopPlugin(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      frameworkLogger.log(
        "plugin-integration",
        "stopped",
        "info",
        { name: this.name }
      );
    }
  }

  /**
   * Get MCP server configuration (if type is MCP_SERVER)
   */
  getMcpServerConfig(): { serverName: string; command: string; args?: string[]; env?: Record<string, string>; timeout?: number } | null {
    if (this.pluginType !== PluginType.MCP_SERVER || !this.manifest?.runtime) {
      return null;
    }

    return {
      serverName: this.name,
      command: this.manifest.runtime.command,
      args: this.manifest.runtime.args,
      env: this.manifest.runtime.env,
      timeout: this.manifest.runtime.timeout,
    };
  }

  /**
   * Get tools provided by this plugin
   */
  getTools(): Array<{ name: string; description: string }> {
    return (this.manifest?.tools || []).map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }

  /**
   * Get capabilities
   */
  getCapabilities(): string[] {
    return this.manifest?.capabilities || [];
  }

  /**
   * Get routing mappings for this plugin (override in subclasses)
   */
  getRoutingMappings(): PluginRoutingMapping[] {
    return [];
  }

  /**
   * Set auto-start preference
   */
  setAutoStart(autoStart: boolean): void {
    this.autoStart = autoStart;
  }

  /**
   * Get plugin type
   */
  getPluginType(): PluginType {
    return this.pluginType;
  }
}
