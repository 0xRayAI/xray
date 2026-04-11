/**
 * Plugin Manager
 *
 * Core class for managing 0xRay plugins.
 * Handles plugin lifecycle: install, enable, activate, disable, deactivate, uninstall.
 *
 * @version 1.0.0
 */
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { PluginType, PluginState, } from './types/index.js';
import { frameworkLogger } from '../core/framework-logger.js';
export class PluginManager {
    config;
    plugins = new Map();
    activeProcesses = new Map();
    registry = [];
    constructor(config) {
        this.config = {
            pluginsDir: config.pluginsDir || '.strray/plugins',
            configPath: config.configPath || '.strray/config/plugin-config.json',
            autoActivate: config.autoActivate ?? true,
            fallbackToLLM: config.fallbackToLLM ?? true,
        };
    }
    async initialize() {
        await this.ensureDirectories();
        await this.loadRegistry();
        await this.discoverPlugins();
        if (this.config.autoActivate) {
            await this.activateEnabledPlugins();
        }
    }
    async ensureDirectories() {
        const dirs = [this.config.pluginsDir, path.dirname(this.config.configPath)];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
    async loadRegistry() {
        const registryPath = path.join(this.config.pluginsDir, 'registry.json');
        if (fs.existsSync(registryPath)) {
            try {
                const content = fs.readFileSync(registryPath, 'utf-8');
                this.registry = JSON.parse(content).plugins || [];
            }
            catch (e) {
                this.registry = [];
            }
        }
        else {
            this.registry = [];
            await this.saveRegistry();
        }
    }
    async saveRegistry() {
        const registryPath = path.join(this.config.pluginsDir, 'registry.json');
        fs.writeFileSync(registryPath, JSON.stringify({ version: '1.0.0', plugins: this.registry }, null, 2));
    }
    async discoverPlugins() {
        if (!fs.existsSync(this.config.pluginsDir)) {
            return;
        }
        const entries = fs.readdirSync(this.config.pluginsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const manifestPath = path.join(this.config.pluginsDir, entry.name, 'plugin.yaml');
                if (fs.existsSync(manifestPath)) {
                    await this.loadPlugin(entry.name);
                }
            }
        }
    }
    async loadPlugin(name) {
        const pluginPath = path.join(this.config.pluginsDir, name);
        const manifestPath = path.join(pluginPath, 'plugin.yaml');
        try {
            const content = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = this.parseYaml(content);
            const plugin = {
                manifest: manifest,
                path: pluginPath,
                state: this.getPluginState(name),
                install: async (ctx) => this.installPlugin(name, ctx),
                enable: async (ctx) => this.enablePlugin(name, ctx),
                activate: async (ctx) => this.activatePlugin(name, ctx),
                deactivate: async () => this.deactivatePlugin(name),
                disable: async () => this.disablePlugin(name),
                uninstall: async (ctx) => this.uninstallPlugin(name, ctx),
                getServerConfig: () => this.getMcpServerConfig(manifest, name),
                getTools: () => manifest.tools || [],
                getCapabilities: () => manifest.capabilities || [],
            };
            this.plugins.set(name, plugin);
            return plugin;
        }
        catch (e) {
            frameworkLogger.log('plugin-manager', 'load-error', 'error', { name, error: e.message });
            return null;
        }
    }
    getPluginState(name) {
        const entry = this.registry.find(p => p.name === name);
        if (!entry) {
            return PluginState.INSTALLED;
        }
        if (entry.state === PluginState.ACTIVE) {
            return PluginState.ACTIVE;
        }
        if (entry.enabled) {
            return PluginState.ENABLED;
        }
        return PluginState.INSTALLED;
    }
    parseYaml(content) {
        const result = {};
        const lines = content.split('\n');
        let currentKey = '';
        let currentIndent = 0;
        const stack = [{ indent: -1, obj: result }];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const indent = line.search(/\S/);
            const isListItem = trimmed.startsWith('- ');
            if (isListItem) {
                const value = trimmed.slice(2).trim();
                const top = stack[stack.length - 1];
                if (top && !Array.isArray(top.obj[currentKey])) {
                    top.obj[currentKey] = [];
                }
                if (top && currentKey) {
                    top.obj[currentKey].push(value);
                }
                continue;
            }
            const colonIndex = trimmed.indexOf(':');
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
    getMcpServerConfig(manifest, name) {
        if (manifest.type !== PluginType.MCP_SERVER || !manifest.runtime) {
            return null;
        }
        return {
            serverName: name,
            command: manifest.runtime.command,
            args: manifest.runtime.args || [],
            env: manifest.runtime.env || {},
            timeout: manifest.runtime.timeout || 30000,
        };
    }
    async activateEnabledPlugins() {
        for (const entry of this.registry) {
            if (entry.enabled) {
                await this.activatePlugin(entry.name, this.getDefaultContext());
            }
        }
    }
    getDefaultContext() {
        return {
            projectRoot: process.cwd(),
            pluginsDir: this.config.pluginsDir,
            configDir: path.dirname(this.config.configPath),
            env: process.env,
        };
    }
    async installPlugin(name, context) {
        const pluginPath = path.join(context.pluginsDir, name);
        if (fs.existsSync(pluginPath)) {
            return { success: false, path: pluginPath, error: 'Plugin already installed' };
        }
        fs.mkdirSync(pluginPath, { recursive: true });
        const entry = {
            name,
            type: PluginType.MCP_SERVER,
            version: '0.0.0',
            path: pluginPath,
            state: PluginState.INSTALLED,
            enabled: false,
            autoStart: false,
        };
        this.registry.push(entry);
        await this.saveRegistry();
        return { success: true, path: pluginPath };
    }
    async enablePlugin(name, context) {
        const entry = this.registry.find(p => p.name === name);
        if (!entry) {
            return { success: false, error: 'Plugin not found' };
        }
        entry.enabled = true;
        entry.state = PluginState.ENABLED;
        await this.saveRegistry();
        if (this.config.autoActivate) {
            await this.activatePlugin(name, context);
        }
        return { success: true };
    }
    async disablePlugin(name) {
        await this.deactivatePlugin(name);
        const entry = this.registry.find(p => p.name === name);
        if (entry) {
            entry.enabled = false;
            entry.state = PluginState.INSTALLED;
            await this.saveRegistry();
        }
    }
    async activatePlugin(name, context) {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            return { success: false, error: 'Plugin not loaded' };
        }
        if (plugin.manifest.type === PluginType.MCP_SERVER && plugin.manifest.runtime) {
            const config = plugin.getServerConfig();
            if (config) {
                try {
                    const proc = spawn(config.command, config.args || [], {
                        env: { ...process.env, ...config.env },
                        stdio: 'pipe',
                    });
                    this.activeProcesses.set(name, proc);
                    const entry = this.registry.find(p => p.name === name);
                    if (entry) {
                        entry.state = PluginState.ACTIVE;
                        await this.saveRegistry();
                    }
                    frameworkLogger.log('plugin-manager', 'activated', 'info', { name, pid: proc.pid });
                    return {
                        success: true,
                        pid: proc.pid ?? 0,
                        tools: plugin.getTools().map(t => t.name),
                    };
                }
                catch (e) {
                    return { success: false, error: e.message };
                }
            }
        }
        return { success: true };
    }
    async deactivatePlugin(name) {
        const proc = this.activeProcesses.get(name);
        if (proc) {
            proc.kill();
            this.activeProcesses.delete(name);
        }
        const entry = this.registry.find(p => p.name === name);
        if (entry) {
            entry.state = PluginState.ENABLED;
            await this.saveRegistry();
        }
        frameworkLogger.log('plugin-manager', 'deactivated', 'info', { name });
    }
    async uninstallPlugin(name, context) {
        await this.deactivatePlugin(name);
        const pluginPath = path.join(context.pluginsDir, name);
        if (fs.existsSync(pluginPath)) {
            fs.rmSync(pluginPath, { recursive: true, force: true });
        }
        this.registry = this.registry.filter(p => p.name !== name);
        this.plugins.delete(name);
        await this.saveRegistry();
    }
    getPlugin(name) {
        return this.plugins.get(name);
    }
    getActivePlugins(type) {
        const active = [];
        for (const plugin of this.plugins.values()) {
            if (!type || plugin.manifest.type === type) {
                active.push(plugin);
            }
        }
        return active;
    }
    getRegistry() {
        return this.registry;
    }
    getMcpServerConfigs() {
        const configs = [];
        for (const plugin of this.getActivePlugins(PluginType.MCP_SERVER)) {
            const config = plugin.getServerConfig();
            if (config) {
                configs.push(config);
            }
        }
        return configs;
    }
    isActive(name) {
        return this.activeProcesses.has(name);
    }
    shutdown() {
        for (const name of this.activeProcesses.keys()) {
            this.deactivatePlugin(name);
        }
    }
}
//# sourceMappingURL=plugin-manager.js.map