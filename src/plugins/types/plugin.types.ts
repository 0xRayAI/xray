/**
 * Plugin Types and Interfaces
 * 
 * Core type definitions for StringRay plugin architecture.
 * 
 * @version 1.0.0
 */

export enum PluginType {
  MCP_SERVER = 'mcp-server',
  SKILL = 'skill',
  INTEGRATION = 'integration',
  AGENT = 'agent',
}

export enum PluginState {
  UNINSTALLED = 'uninstalled',
  INSTALLED = 'installed',
  ENABLED = 'enabled',
  ACTIVE = 'active',
}

export interface PluginManifest {
  name: string;
  version: string;
  type: PluginType;
  description: string;
  license?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  
  runtime?: PluginRuntime;
  tools?: PluginTool[];
  capabilities?: string[];
  dependencies?: Record<string, string>;
  config?: Record<string, PluginConfigField>;
}

export interface PluginRuntime {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  workingDir?: string;
}

export interface PluginTool {
  name: string;
  description: string;
  inputSchema?: object;
  outputSchema?: object;
}

export interface PluginConfigField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  default?: unknown;
  enum?: string[];
  required?: boolean;
}

export interface IServerConfig {
  serverName: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

export interface PluginRegistryEntry {
  name: string;
  type: PluginType;
  version: string;
  path: string;
  state: PluginState;
  enabled: boolean;
  autoStart: boolean;
  tools?: string[];
  config?: Record<string, unknown>;
}

export interface PluginContext {
  projectRoot: string;
  pluginsDir: string;
  configDir: string;
  env: Record<string, string>;
}

export interface InstallResult {
  success: boolean;
  path: string;
  error?: string;
}

export interface EnableResult {
  success: boolean;
  error?: string;
}

export interface ActivateResult {
  success: boolean;
  pid?: number;
  tools?: string[];
  error?: string;
}

export interface Plugin {
  manifest: PluginManifest;
  path: string;
  state: PluginState;
  
  install(context: PluginContext): Promise<InstallResult>;
  enable(context: PluginContext): Promise<EnableResult>;
  activate(context: PluginContext): Promise<ActivateResult>;
  deactivate(context: PluginContext): Promise<void>;
  disable(context: PluginContext): Promise<void>;
  uninstall(context: PluginContext): Promise<void>;
  
  getServerConfig(): IServerConfig | null;
  getTools(): PluginTool[];
  getCapabilities(): string[];
}

export interface PluginManagerConfig {
  pluginsDir: string;
  configPath: string;
  autoActivate?: boolean;
  fallbackToLLM?: boolean;
}

export interface PluginRoutingMapping {
  keywords: string[];
  skill: string;
  agent: string;
  confidence: number;
}
