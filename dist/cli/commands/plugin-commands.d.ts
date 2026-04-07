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
export declare function pluginListCommand(): Promise<void>;
export declare function pluginInstallCommand(pluginName: string): Promise<void>;
export declare function pluginEnableCommand(pluginName: string): Promise<void>;
export declare function pluginDisableCommand(pluginName: string): Promise<void>;
export declare function pluginStatusCommand(pluginName: string): Promise<void>;
export declare function pluginUninstallCommand(pluginName: string): Promise<void>;
//# sourceMappingURL=plugin-commands.d.ts.map