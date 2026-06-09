/**
 * Plugin Registry
 * 
 * Industrial-grade plugin registry for managing 0xRay plugins.
 * Provides discovery, loading, lifecycle management, dependency resolution,
 * and comprehensive observability.
 * 
 * Features:
 * - Auto-discovery from filesystem
 * - Dependency resolution and validation
 * - Plugin state management
 * - Batch operations with error recovery
 * - Comprehensive health monitoring
 * - Metrics aggregation
 * - Event-driven architecture
 * 
 * @version 1.1.0
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import { IntegrationRegistry } from "../base/registry.js";
import { 
  PluginIntegration, 
  PluginManifest, 
  PluginRoutingMapping, 
  PluginType,
  PluginState,
  PluginConfig,
  PluginMetrics,
  PluginResourceLimits,
  PluginPermissions,
  parseYamlManifest,
  DEFAULT_PLUGIN_CONFIG,
  validatePluginManifest,
  satisfiesVersion,
} from "./plugin-integration.js";
import { frameworkLogger } from "../../core/framework-logger.js";

export interface PluginRegistryConfig {
  pluginsDir: string;
  configPath?: string;
  autoStart?: boolean;
  enableMetrics?: boolean;
  maxRestarts?: number;
  restartDelayMs?: number;
}

export interface PluginLoadResult {
  name: string;
  success: boolean;
  error?: string;
  plugin?: PluginIntegration;
}

export interface PluginStatus {
  name: string;
  type: string;
  version: string;
  state: PluginState;
  enabled: boolean;
  healthy: boolean;
  uptime: number;
  restarts: number;
}

export interface RegistryMetrics {
  totalPlugins: number;
  activePlugins: number;
  enabledPlugins: number;
  errorPlugins: number;
  totalToolCalls: number;
  totalErrors: number;
  pluginsByType: Record<string, number>;
}

export interface DependencyInfo {
  name: string;
  version: string;
  satisfied: boolean;
  optional: boolean;
}

/**
 * Plugin Registry Events
 */
export type PluginRegistryEventType = 
  | "plugin-loaded"
  | "plugin-unloaded"
  | "plugin-enabled"
  | "plugin-disabled"
  | "plugin-reloaded"
  | "plugin-error"
  | "discovery-complete"
  | "dependency-resolved"
  | "dependency-missing"
  | "metrics-updated"
  | "error";

export interface PluginRegistryEvent {
  type: PluginRegistryEventType;
  timestamp: number;
  pluginName?: string | undefined;
  data?: Record<string, unknown> | undefined;
  error?: Error | undefined;
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
  private enableMetrics: boolean;
  private enableHotReload: boolean;
  private maxRestarts: number;
  private restartDelayMs: number;
  private plugins: Map<string, PluginIntegration> = new Map();
  private integrationRegistry: IntegrationRegistry;
  private initialized: boolean = false;
  private metricsInterval?: NodeJS.Timeout;
  private watcher?: fs.FSWatcher;
  private reloadDebounce: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<PluginRegistryConfig & { enableHotReload?: boolean }> = {}) {
    super();
    this.pluginsDir = config.pluginsDir || ".xray/plugins";
    this.configPath = config.configPath || ".xray/config/plugin-config.json";
    this.autoStart = config.autoStart ?? true;
    this.enableMetrics = config.enableMetrics ?? true;
    this.enableHotReload = config.enableHotReload ?? false;
    this.maxRestarts = config.maxRestarts ?? 3;
    this.restartDelayMs = config.restartDelayMs ?? 1000;
    this.integrationRegistry = new IntegrationRegistry();
  }

  /**
   * Initialize the registry and discover plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.ensureDirectories();
    await this.discoverPlugins();
    this.initialized = true;

    if (this.enableMetrics) {
      this.startMetricsCollection();
    }

    if (this.enableHotReload) {
      this.startFileWatcher();
    }

    this.emitEvent("discovery-complete", {
      pluginCount: this.plugins.size,
    });

    await frameworkLogger.log(
      "plugin-registry",
      "initialized",
      "info",
      { pluginCount: this.plugins.size, pluginsDir: this.pluginsDir }
    );
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
        try {
          await this.loadPlugin(entry.name);
        } catch (error) {
          this.emitEvent("plugin-error", {
            pluginName: entry.name,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    }
  }

  /**
   * Validate plugin dependencies
   */
  private validateDependencies(manifest: PluginManifest, loadedPlugins: Map<string, PluginIntegration>): DependencyInfo[] {
    const results: DependencyInfo[] = [];
    const deps = { ...manifest.dependencies, ...manifest.optionalDependencies };
    
    for (const [name, version] of Object.entries(deps)) {
      const plugin = loadedPlugins.get(name);
      const isOptional = !!manifest.optionalDependencies?.[name];
      
      if (!plugin) {
        results.push({
          name,
          version,
          satisfied: isOptional,
          optional: isOptional,
        });
        
        if (!isOptional) {
          this.emitEvent("dependency-missing", { name, version });
        }
      } else {
        const satisfied = satisfiesVersion(plugin.version, version);
        results.push({
          name,
          version,
          satisfied,
          optional: isOptional,
        });
        
        if (satisfied) {
          this.emitEvent("dependency-resolved", { name, version });
        }
      }
    }
    
    return results;
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(name: string): Promise<PluginIntegration | null> {
    // Check if already loaded
    if (this.plugins.has(name)) {
      return this.plugins.get(name)!;
    }

    const pluginPath = path.join(this.pluginsDir, name);
    const manifestPath = path.join(pluginPath, "plugin.yaml");

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(manifestPath, "utf-8");
      const parsed = parseYamlManifest(content);
      
      const manifest: PluginManifest = {
        name: String(parsed.name || name),
        version: String(parsed.version || "1.0.0"),
        type: this.parsePluginType(parsed.type),
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
      const validation = validatePluginManifest(manifest);
      if (!validation.valid) {
        throw new Error(`Manifest validation failed: ${validation.errors.join(", ")}`);
      }

      // Validate dependencies
      const depResults = this.validateDependencies(manifest, this.plugins);
      const missingRequired = depResults.filter(d => !d.satisfied && !d.optional);
      
      if (missingRequired.length > 0) {
        throw new Error(
          `Missing required dependencies: ${missingRequired.map(d => d.name).join(", ")}`
        );
      }

      const config: Partial<PluginConfig> = {
        ...DEFAULT_PLUGIN_CONFIG,
        type: manifest.type,
        autoStart: this.autoStart,
      };

      if (manifest.resourceLimits) {
        config.resourceLimits = manifest.resourceLimits;
      }
      if (manifest.permissions) {
        config.permissions = manifest.permissions;
      }

      const plugin = new PluginIntegration(
        name,
        manifest.version,
        pluginPath,
        manifest.type,
        config,
      );
      
      await plugin.initialize();
      
      this.plugins.set(name, plugin);
      
      this.emitEvent("plugin-loaded", { name, type: manifest.type, version: manifest.version });
      
      await frameworkLogger.log(
        "plugin-registry",
        "plugin-loaded",
        "info",
        { name, type: manifest.type, version: manifest.version }
      );

      return plugin;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.emitEvent("plugin-error", {
        pluginName: name,
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      
      await frameworkLogger.log(
        "plugin-registry",
        "plugin-load-error",
        "error",
        { name, error: errorMessage }
      );
      
      return null;
    }
  }

  /**
   * Parse plugin type from string
   */
  private parsePluginType(type: unknown): PluginType {
    if (typeof type !== "string") return PluginType.MCP_SERVER;
    const upper = type.toUpperCase().replace(/-/g, "_");
    
    const typeMap: Record<string, PluginType> = {
      "MCP_SERVER": PluginType.MCP_SERVER,
      "SKILL": PluginType.SKILL,
      "INTEGRATION": PluginType.INTEGRATION,
      "AGENT": PluginType.AGENT,
    };
    
    return typeMap[upper] || PluginType.MCP_SERVER;
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    try {
      await plugin.shutdown();
      this.plugins.delete(name);
      
      this.emitEvent("plugin-unloaded", { name });
      
      await frameworkLogger.log(
        "plugin-registry",
        "plugin-unloaded",
        "info",
        { name }
      );
      
      return true;
    } catch (error) {
      this.emitEvent("plugin-error", {
        pluginName: name,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      
      return false;
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    try {
      await plugin.enable();
      this.emitEvent("plugin-enabled", { name });
      return true;
    } catch (error) {
      this.emitEvent("plugin-error", {
        pluginName: name,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      return false;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    try {
      await plugin.disable();
      this.emitEvent("plugin-disabled", { name });
      return true;
    } catch (error) {
      this.emitEvent("plugin-error", {
        pluginName: name,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      return false;
    }
  }

  /**
   * Restart a plugin
   */
  async restartPlugin(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    try {
      await plugin.restart();
      return true;
    } catch (error) {
      this.emitEvent("plugin-error", {
        pluginName: name,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      return false;
    }
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
   * Get plugins by type
   */
  getPluginsByType(type: PluginType): PluginIntegration[] {
    return this.getAllPlugins().filter(p => p.getPluginType() === type);
  }

  /**
   * Get plugins by state
   */
  getPluginsByState(state: PluginState): PluginIntegration[] {
    return this.getAllPlugins().filter(p => p.getPluginState() === state);
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
      if (plugin.getPluginType() === PluginType.MCP_SERVER) {
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
   * Health check all plugins
   */
  async healthCheckAll(): Promise<Record<string, { healthy: boolean; message: string; details?: Record<string, unknown> }>> {
    const results: Record<string, { healthy: boolean; message: string; details?: Record<string, unknown> }> = {};

    for (const [name, plugin] of this.plugins) {
      try {
        const health = await plugin.healthCheck();
        const result: { healthy: boolean; message: string; details?: Record<string, unknown> } = { 
          healthy: health.healthy, 
          message: health.message 
        };
        if (health.details && Object.keys(health.details).length > 0) {
          result.details = health.details;
        }
        results[name] = result;
      } catch (error) {
        results[name] = { 
          healthy: false, 
          message: (error as Error).message,
        };
      }
    }

    return results;
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): RegistryMetrics {
    const plugins = this.getAllPlugins();
    const metrics: RegistryMetrics = {
      totalPlugins: plugins.length,
      activePlugins: 0,
      enabledPlugins: 0,
      errorPlugins: 0,
      totalToolCalls: 0,
      totalErrors: 0,
      pluginsByType: {},
    };

    for (const plugin of plugins) {
      const state = plugin.getPluginState();
      const pluginMetrics = plugin.getMetrics();
      
      if (state === PluginState.ACTIVE) metrics.activePlugins++;
      if (plugin.isEnabled()) metrics.enabledPlugins++;
      if (state === PluginState.ERROR) metrics.errorPlugins++;
      
      metrics.totalToolCalls += pluginMetrics.toolCallsCount;
      metrics.totalErrors += pluginMetrics.errorsCount;
      
      const type = plugin.getPluginType();
      metrics.pluginsByType[type] = (metrics.pluginsByType[type] || 0) + 1;
    }

    return metrics;
  }

  /**
   * Start metrics collection interval
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getMetrics();
      this.emitEvent("metrics-updated", metrics as unknown as Record<string, unknown>);
    }, 30000); // Every 30 seconds
  }

  /**
   * Start file watcher for hot-reload
   */
  private startFileWatcher(): void {
    try {
      this.watcher = fs.watch(this.pluginsDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        
        const parts = filename.split(path.sep);
        const pluginName = parts[0];
        const isManifest = filename.endsWith("plugin.yaml");
        
        if (isManifest && pluginName) {
          this.debounceReload(pluginName);
        }
      });

      frameworkLogger.log(
        "plugin-registry",
        "hot-reload-started",
        "info",
        { pluginsDir: this.pluginsDir }
      );
    } catch (error) {
      frameworkLogger.log(
        "plugin-registry",
        "hot-reload-failed",
        "error",
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Debounce plugin reload to avoid multiple reloads during file writes
   */
  private debounceReload(pluginName: string): void {
    const existing = this.reloadDebounce.get(pluginName);
    if (existing) {
      clearTimeout(existing);
    }
    
    const timeout = setTimeout(() => {
      this.reloadDebounce.delete(pluginName);
      this.hotReloadPlugin(pluginName).catch((error) => {
        frameworkLogger.log(
          "plugin-registry",
          "hot-reload-error",
          "error",
          { pluginName, error: error instanceof Error ? error.message : String(error) }
        );
      });
    }, 1000);
    
    this.reloadDebounce.set(pluginName, timeout);
  }

  /**
   * Hot-reload a single plugin
   */
  private async hotReloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    const wasEnabled = plugin?.isEnabled() ?? false;
    const wasActive = plugin?.getPluginState() === PluginState.ACTIVE;
    
    // Unload existing plugin
    if (plugin) {
      await this.unloadPlugin(pluginName);
      this.emitEvent("plugin-reloaded", { name: pluginName, phase: "unloaded" });
    }
    
    // Reload plugin
    const newPlugin = await this.loadPlugin(pluginName);
    if (newPlugin) {
      if (wasEnabled || this.autoStart) {
        await this.enablePlugin(pluginName);
      }
      if (wasActive && newPlugin.getPluginState() === PluginState.ENABLED) {
        await newPlugin.restart();
      }
      this.emitEvent("plugin-reloaded", { name: pluginName, phase: "loaded" });
      
      await frameworkLogger.log(
        "plugin-registry",
        "plugin-hot-reloaded",
        "info",
        { name: pluginName }
      );
    }
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.watcher) {
      this.watcher.close();
    }
    
    for (const timeout of this.reloadDebounce.values()) {
      clearTimeout(timeout);
    }
    this.reloadDebounce.clear();

    const shutdownPromises = Array.from(this.plugins.values()).map(p => p.shutdown());
    const results = await Promise.allSettled(shutdownPromises);
    
    // Log any shutdown failures
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const pluginNames = Array.from(this.plugins.keys());
        frameworkLogger.log(
          "plugin-registry",
          "plugin-shutdown-error",
          "error",
          { name: pluginNames[index], error: result.reason }
        );
      }
    });
    
    this.plugins.clear();
    this.initialized = false;
  }

  /**
   * Get status summary
   */
  getStatus(): {
    initialized: boolean;
    pluginCount: number;
    plugins: PluginStatus[];
    metrics: RegistryMetrics;
  } {
    return {
      initialized: this.initialized,
      pluginCount: this.plugins.size,
      plugins: this.getAllPlugins().map((p) => {
        const metrics = p.getMetrics();
        return {
          name: p.name,
          type: p.getPluginType(),
          version: p.version,
          state: p.getPluginState(),
          enabled: p.isEnabled(),
          healthy: p.getPluginState() === PluginState.ACTIVE,
          uptime: metrics.uptime,
          restarts: metrics.totalRestarts,
        };
      }),
      metrics: this.getMetrics(),
    };
  }

  /**
   * Get the underlying IntegrationRegistry
   */
  getIntegrationRegistry(): IntegrationRegistry {
    return this.integrationRegistry;
  }

  /**
   * Emit a registry event
   */
  private emitEvent(
    type: PluginRegistryEventType,
    data: Record<string, unknown> = {},
    error?: Error,
  ): void {
    const event: PluginRegistryEvent = {
      type,
      timestamp: Date.now(),
      ...data,
      error,
    };

    this.emit(type, event as unknown as Record<string, unknown>);
    this.emit("event", event as unknown as Record<string, unknown>);
  }
}
