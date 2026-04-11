/**
 * Plugin Manager
 *
 * Core class for managing 0xRay plugins.
 * Handles plugin lifecycle: install, enable, activate, disable, deactivate, uninstall.
 *
 * @version 1.0.0
 */
import { PluginType, Plugin, PluginContext, PluginManagerConfig, IServerConfig, PluginRegistryEntry, InstallResult, EnableResult, ActivateResult } from './types/index.js';
export declare class PluginManager {
    private config;
    private plugins;
    private activeProcesses;
    private registry;
    constructor(config: PluginManagerConfig);
    initialize(): Promise<void>;
    private ensureDirectories;
    private loadRegistry;
    private saveRegistry;
    private discoverPlugins;
    private loadPlugin;
    private getPluginState;
    private parseYaml;
    private getMcpServerConfig;
    private activateEnabledPlugins;
    private getDefaultContext;
    installPlugin(name: string, context: PluginContext): Promise<InstallResult>;
    enablePlugin(name: string, context: PluginContext): Promise<EnableResult>;
    disablePlugin(name: string): Promise<void>;
    activatePlugin(name: string, context: PluginContext): Promise<ActivateResult>;
    deactivatePlugin(name: string): Promise<void>;
    uninstallPlugin(name: string, context: PluginContext): Promise<void>;
    getPlugin(name: string): Plugin | undefined;
    getActivePlugins(type?: PluginType): Plugin[];
    getRegistry(): PluginRegistryEntry[];
    getMcpServerConfigs(): IServerConfig[];
    isActive(name: string): boolean;
    shutdown(): void;
}
//# sourceMappingURL=plugin-manager.d.ts.map