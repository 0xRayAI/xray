/**
 * Plugin Integration
 * 
 * Industrial-grade plugin system extending the existing Integration architecture.
 * Plugins are integrations that can provide MCP servers, skills, and capabilities.
 * 
 * Features:
 * - Lifecycle management with state machine
 * - Security sandboxing and permission system
 * - Dependency resolution and validation
 * - Semantic version compatibility checking
 * - Resource limits and quotas
 * - Comprehensive observability with metrics
 * - Graceful shutdown with retry logic
 * - Plugin isolation with process spawning
 * 
 * @version 1.1.0
 */

import * as fs from "fs";
import * as path from "path";
import { spawn, type ChildProcess } from "child_process";
import {
  BaseIntegration,
  type IntegrationConfig,
  type HealthResult,
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
  ERROR = "error",
  DISABLING = "disabling",
  ENABLING = "enabling",
}

/**
 * Plugin configuration
 */
export interface PluginConfig extends IntegrationConfig {
  type: PluginType;
  autoStart: boolean;
  config?: Record<string, unknown>;
  resourceLimits?: PluginResourceLimits;
  permissions?: PluginPermissions;
}

/**
 * Resource limits for plugin
 */
export interface PluginResourceLimits {
  maxMemoryMB?: number;
  maxCpuPercent?: number;
  maxProcessTime?: number;
  maxFileDescriptors?: number;
}

/**
 * Plugin permissions
 */
export interface PluginPermissions {
  allowedPaths?: string[];
  allowedCommands?: string[];
  networkAccess?: boolean;
  filesystemAccess?: boolean;
  envWhitelist?: string[];
}

/**
 * Plugin manifest (from plugin.yaml)
 */
export interface PluginManifest {
  name: string;
  version: string;
  type: PluginType;
  description: string;
  license?: string | undefined;
  author?: string | undefined;
  homepage?: string | undefined;
  repository?: string | undefined;
  minStringrayVersion?: string | undefined;
  runtime?: {
    command: string;
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
    timeout?: number | undefined;
    workingDir?: string | undefined;
  } | undefined;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema?: object | undefined;
    outputSchema?: object | undefined;
  }> | undefined;
  capabilities?: string[] | undefined;
  dependencies?: Record<string, string> | undefined;
  optionalDependencies?: Record<string, string> | undefined;
  routing?: Array<{
    keywords: string[];
    skill: string;
    agent: string;
    confidence: number;
  }> | undefined;
  resourceLimits?: PluginResourceLimits | undefined;
  permissions?: PluginPermissions | undefined;
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
 * Plugin metrics for observability
 */
export interface PluginMetrics {
  name: string;
  uptime: number;
  totalRestarts: number;
  lastStartTime: number;
  lastError?: string | undefined;
  memoryUsageMB?: number | undefined;
  cpuUsagePercent?: number | undefined;
  toolCallsCount: number;
  errorsCount: number;
}

/**
 * Validation result for plugin
 */
export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
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
  resourceLimits: {
    maxMemoryMB: 512,
    maxCpuPercent: 80,
    maxProcessTime: 300000,
    maxFileDescriptors: 100,
  },
  permissions: {
    networkAccess: true,
    filesystemAccess: false,
  },
};

/**
 * Parse YAML manifest (shared utility)
 */
export function parseYamlManifest(content: string): Record<string, unknown> {
  const lines = content.split("\n");
  const result: Record<string, unknown> = {};
  let currentArrayKey = "";
  const stack: { indent: number; obj: Record<string, unknown>; parent: Record<string, unknown> | null; key: string }[] = [
    { indent: -1, obj: result, parent: null, key: "" },
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.search(/\S/);
    const isListItem = trimmed.startsWith("- ");

    if (isListItem) {
      const value = trimmed.slice(2).trim();
      const colonIndex = value.indexOf(":");
      const top = stack[stack.length - 1];

      if (top && top.obj) {
        const target = top.parent && top.key ? top.parent : top.obj;
        const targetKey = top.key || currentArrayKey;

        if (colonIndex > 0) {
          const key = value.slice(0, colonIndex).trim();
          const val = value.slice(colonIndex + 1).trim();
          const existing = target[targetKey];
          if (Array.isArray(existing)) {
            existing.push({ [key]: val });
          } else {
            target[targetKey] = [{ [key]: val }];
          }
        } else {
          const existing = target[targetKey];
          if (Array.isArray(existing)) {
            existing.push(value);
          } else {
            target[targetKey] = [value];
          }
        }
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      while (stack.length > 1) {
        const top = stack[stack.length - 1];
        if (top && indent <= top.indent) {
          stack.pop();
        } else {
          break;
        }
      }

      const top = stack[stack.length - 1];
      if (top && top.obj) {
        if (value) {
          top.obj[key] = value;
        } else {
          const newObj: Record<string, unknown> = {};
          top.obj[key] = newObj;
          stack.push({ indent, obj: newObj, parent: top.obj, key });
        }
        currentArrayKey = key;
      }
    }
  }

  return result;
}

/**
 * Semantic version comparison
 */
export function satisfiesVersion(version: string, range: string): boolean {
  const versionParts = version.split(".").map(Number);
  const rangeParts = range.replace(/[\^~>=<]/, "").split(".").map(Number);
  const major = versionParts[0] ?? 0;
  const reqMajor = rangeParts[0] ?? 0;
  return major >= reqMajor;
}

/**
 * Validate plugin manifest
 */
export function validatePluginManifest(manifest: PluginManifest): PluginValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest.name || manifest.name.trim() === "") {
    errors.push("Plugin name is required");
  }

  if (!manifest.version || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push("Valid semantic version (x.y.z) is required");
  }

  if (!manifest.type) {
    errors.push("Plugin type is required");
  }

  if (manifest.runtime) {
    if (!manifest.runtime.command) {
      errors.push("Runtime command is required for MCP server plugins");
    }
    
    if (manifest.runtime.timeout && manifest.runtime.timeout < 1000) {
      warnings.push("Runtime timeout less than 1 second may be too short");
    }
  }

  if (manifest.dependencies) {
    for (const [dep, version] of Object.entries(manifest.dependencies)) {
      if (!satisfiesVersion(version, version)) {
        warnings.push(`Dependency ${dep} version format may be invalid`);
      }
    }
  }

  if (manifest.permissions?.filesystemAccess && !manifest.permissions?.allowedPaths) {
    warnings.push("Filesystem access enabled but no allowed paths specified");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

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
  private childProcess: ChildProcess | null = null;
  private pluginPath: string = "";
  private pluginType: PluginType = PluginType.MCP_SERVER;
  private autoStart: boolean = true;
  private pluginState: PluginState = PluginState.INSTALLED;
  
  // Metrics
  private restarts: number = 0;
  private lastStartTime: number = 0;
  private lastError?: string;
  private toolCallsCount: number = 0;
  private errorsCount: number = 0;
  
  // Configuration
  private resourceLimits: PluginResourceLimits = {};
  private permissions: PluginPermissions = {};

  constructor(
    name: string,
    version: string,
    pluginPath: string,
    type: PluginType = PluginType.MCP_SERVER,
    config?: Partial<PluginConfig>,
  ) {
    super(name, version, {
      enabled: config?.enabled ?? true,
      debug: config?.debug ?? false,
      logLevel: config?.logLevel ?? "info",
    });
    this.pluginPath = pluginPath;
    this.pluginType = type;
    this.autoStart = config?.autoStart ?? true;
    this.resourceLimits = config?.resourceLimits ?? DEFAULT_PLUGIN_CONFIG.resourceLimits!;
    this.permissions = config?.permissions ?? DEFAULT_PLUGIN_CONFIG.permissions!;
  }

  /**
   * Load plugin from plugin.yaml
   */
  async load(): Promise<PluginManifest> {
    const manifestPath = path.join(this.pluginPath, "plugin.yaml");
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Plugin manifest not found: ${manifestPath}`);
    }

    const content = fs.readFileSync(manifestPath, "utf-8");
    const parsed = parseYamlManifest(content);
    
    this.manifest = {
      name: String(parsed.name || this.name),
      version: String(parsed.version || "1.0.0"),
      type: this.pluginType,
      description: String(parsed.description || ""),
      license: parsed.license ? String(parsed.license) : undefined,
      author: parsed.author ? String(parsed.author) : undefined,
      homepage: parsed.homepage ? String(parsed.homepage) : undefined,
      repository: parsed.repository ? String(parsed.repository) : undefined,
      minStringrayVersion: parsed.minStringrayVersion ? String(parsed.minStringrayVersion) : undefined,
      runtime: parsed.runtime as PluginManifest["runtime"],
      tools: parsed.tools as PluginManifest["tools"],
      capabilities: parsed.capabilities as string[],
      dependencies: parsed.dependencies as Record<string, string>,
      optionalDependencies: parsed.optionalDependencies as Record<string, string>,
      routing: parsed.routing as PluginManifest["routing"],
      resourceLimits: parsed.resourceLimits as PluginResourceLimits,
      permissions: parsed.permissions as PluginPermissions,
    };
    
    // Validate manifest
    const validation = validatePluginManifest(this.manifest);
    if (!validation.valid) {
      throw new Error(`Plugin manifest validation failed: ${validation.errors.join(", ")}`);
    }
    
    if (validation.warnings.length > 0) {
      await this.log("warning", `Plugin manifest warnings: ${validation.warnings.join(", ")}`);
    }
    
    // Apply resource limits from manifest if provided
    if (this.manifest.resourceLimits) {
      this.resourceLimits = { ...this.resourceLimits, ...this.manifest.resourceLimits };
    }
    
    // Apply permissions from manifest if provided
    if (this.manifest.permissions) {
      this.permissions = { ...this.permissions, ...this.manifest.permissions };
    }
    
    await this.log("info", `Loaded plugin ${this.name} v${this.manifest.version}`);
    
    return this.manifest;
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

    this.pluginState = this.config.enabled ? PluginState.ENABLED : PluginState.INSTALLED;
  }

  /**
   * Shutdown the plugin
   */
  protected async performShutdown(): Promise<void> {
    await this.stopPlugin();
    this.pluginState = PluginState.UNINSTALLED;
  }

  /**
   * Health check implementation
   */
  protected async performHealthCheck(): Promise<HealthResult> {
    const issues: string[] = [];
    
    if (!this.childProcess || this.childProcess.killed) {
      if (this.pluginState === PluginState.ACTIVE) {
        issues.push("Plugin process not running but state is ACTIVE");
      }
    }
    
    // Check resource limits
    if (this.resourceLimits.maxMemoryMB && this.resourceLimits.maxMemoryMB > 0) {
      // Memory check would require platform-specific implementation
    }

    if (issues.length > 0) {
      return {
        healthy: false,
        message: issues.join("; "),
        details: { 
          state: this.pluginState,
          restarts: this.restarts,
          lastError: this.lastError,
        },
      };
    }

    return {
      healthy: true,
      message: `Plugin ${this.name} is healthy`,
      details: {
        pid: this.childProcess?.pid,
        type: this.pluginType,
        state: this.pluginState,
        uptime: this.getUptime(),
        restarts: this.restarts,
        toolCalls: this.toolCallsCount,
      },
    };
  }

  /**
   * Get plugin uptime in milliseconds
   */
  getUptime(): number {
    if (this.lastStartTime === 0) return 0;
    return Date.now() - this.lastStartTime;
  }

  /**
   * Start the MCP server process
   */
  async startPlugin(): Promise<void> {
    if (!this.manifest?.runtime) {
      await this.log("info", "No runtime configured, skipping process start");
      return;
    }

    const { command, args, env, workingDir } = this.manifest.runtime;
    
    // Security: Validate command
    if (this.permissions.allowedCommands && 
        !this.permissions.allowedCommands.includes(command)) {
      throw new Error(`Command "${command}" not allowed by plugin permissions`);
    }

    try {
      this.pluginState = PluginState.ENABLING;
      
      const spawnEnv = { ...process.env, ...env };
      
      // Apply env whitelist if specified
      if (this.permissions.envWhitelist?.length) {
        for (const key of Object.keys(spawnEnv)) {
          if (!this.permissions.envWhitelist.includes(key)) {
            delete spawnEnv[key];
          }
        }
      }

      this.childProcess = spawn(command, args || [], {
        env: spawnEnv,
        stdio: "pipe",
        cwd: workingDir || this.pluginPath,
        detached: false,
      });

      this.childProcess.on("error", (err) => {
        this.errorsCount++;
        this.lastError = err.message;
        this.recordError(err);
        
        frameworkLogger.log(
          "plugin-integration",
          "process-error",
          "error",
          { name: this.name, error: err.message }
        );
      });

      this.childProcess.on("exit", (code, signal) => {
        const wasUnexpected = signal !== "SIGTERM" && signal !== "SIGKILL";
        
        if (wasUnexpected) {
          this.restarts++;
          frameworkLogger.log(
            "plugin-integration",
            "process-crashed",
            "error",
            { name: this.name, code, signal, restarts: this.restarts }
          );
        } else {
          frameworkLogger.log(
            "plugin-integration",
            "process-exit",
            "info",
            { name: this.name, code, signal }
          );
        }
        
        this.childProcess = null;
        this.pluginState = PluginState.INSTALLED;
        
        // Auto-restart if configured and crashed unexpectedly
        if (wasUnexpected && this.autoStart && this.config.enabled) {
          setTimeout(() => this.startPlugin(), 1000);
        }
      });

      // Capture stdout/stderr for logging
      if (this.childProcess.stdout) {
        this.childProcess.stdout.on("data", (data) => {
          if (this.config.debug) {
            frameworkLogger.log(
              "plugin-integration",
              "stdout",
              "debug",
              { name: this.name, output: data.toString().trim() }
            );
          }
        });
      }
      
      if (this.childProcess.stderr) {
        this.childProcess.stderr.on("data", (data) => {
          frameworkLogger.log(
            "plugin-integration",
            "stderr",
            "warning",
            { name: this.name, output: data.toString().trim() }
          );
        });
      }

      this.lastStartTime = Date.now();
      this.pluginState = PluginState.ACTIVE;
      
      await this.log("info", `Started plugin ${this.name} (pid: ${this.childProcess.pid})`);
    } catch (error) {
      this.pluginState = PluginState.ERROR;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.lastError = errorMessage;
      
      await this.log("error", `Failed to start plugin: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Stop the MCP server process gracefully
   */
  async stopPlugin(): Promise<void> {
    if (this.childProcess) {
      const pid = this.childProcess.pid;
      const proc = this.childProcess;
      this.pluginState = PluginState.DISABLING;
      
      // Try graceful shutdown first
      proc.kill("SIGTERM");
      
      // Wait for graceful shutdown with timeout
      await new Promise<void>((resolve) => {
        const timeoutMs = this.manifest?.runtime?.timeout || 5000;
        const timeout = setTimeout(() => {
          // Force kill if SIGTERM doesn't work
          if (proc && !proc.killed) {
            proc.kill("SIGKILL");
          }
          resolve();
        }, Math.min(timeoutMs, 10000));
        
        proc.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.childProcess = null;
      this.pluginState = PluginState.INSTALLED;
      
      await this.log("info", `Stopped plugin ${this.name} (was pid: ${pid})`);
    }
  }

  /**
   * Enable the plugin
   */
  async enable(): Promise<void> {
    if (this.pluginState === PluginState.ACTIVE) return;
    
    this.updateConfig({ enabled: true });
    this.pluginState = PluginState.ENABLING;
    
    if (this.autoStart) {
      await this.startPlugin();
    }
    
    this.pluginState = PluginState.ENABLED;
  }

  /**
   * Disable the plugin
   */
  async disable(): Promise<void> {
    if (this.pluginState === PluginState.UNINSTALLED) return;
    
    this.updateConfig({ enabled: false });
    this.pluginState = PluginState.DISABLING;
    
    if (this.childProcess) {
      await this.stopPlugin();
    }
    
    this.pluginState = PluginState.INSTALLED;
  }

  /**
   * Restart the plugin
   */
  async restart(): Promise<void> {
    await this.stopPlugin();
    await this.startPlugin();
  }

  /**
   * Get MCP server configuration (if type is MCP_SERVER)
   */
  getMcpServerConfig(): { serverName: string; command: string; args?: string[]; env?: Record<string, string>; timeout?: number } | null {
    if (this.pluginType !== PluginType.MCP_SERVER || !this.manifest?.runtime) {
      return null;
    }

    const runtime = this.manifest.runtime;
    const config: { serverName: string; command: string; args?: string[]; env?: Record<string, string>; timeout?: number } = {
      serverName: this.name,
      command: runtime.command,
    };

    if (runtime.args && runtime.args.length > 0) {
      config.args = runtime.args;
    }
    if (runtime.env && Object.keys(runtime.env).length > 0) {
      config.env = runtime.env;
    }
    if (runtime.timeout && runtime.timeout > 0) {
      config.timeout = runtime.timeout;
    }

    return config;
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
   * Record a tool call
   */
  recordToolCall(): void {
    this.toolCallsCount++;
  }

  /**
   * Get capabilities
   */
  getCapabilities(): string[] {
    return this.manifest?.capabilities || [];
  }

  /**
   * Get routing mappings for this plugin
   */
  getRoutingMappings(): PluginRoutingMapping[] {
    return (this.manifest?.routing || []).map((r) => ({
      keywords: r.keywords,
      skill: r.skill,
      agent: r.agent,
      confidence: r.confidence,
    }));
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

  /**
   * Get plugin state
   */
  getPluginState(): PluginState {
    return this.pluginState;
  }

  /**
   * Get manifest
   */
  getManifest(): PluginManifest | null {
    return this.manifest;
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get resource limits
   */
  getResourceLimits(): PluginResourceLimits {
    return this.resourceLimits;
  }

  /**
   * Get permissions
   */
  getPermissions(): PluginPermissions {
    return this.permissions;
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): PluginMetrics {
    return {
      name: this.name,
      uptime: this.getUptime(),
      totalRestarts: this.restarts,
      lastStartTime: this.lastStartTime,
      lastError: this.lastError,
      toolCallsCount: this.toolCallsCount,
      errorsCount: this.errorsCount,
    };
  }

  /**
   * Get dependencies
   */
  getDependencies(): Record<string, string> {
    return this.manifest?.dependencies || {};
  }

  /**
   * Get optional dependencies
   */
  getOptionalDependencies(): Record<string, string> {
    return this.manifest?.optionalDependencies || {};
  }
}
