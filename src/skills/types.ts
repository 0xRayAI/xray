export interface SkillManifest {
  name: string;
  version: string;
  schema_version: string;
  description: string;
  category?: string | undefined;
  risk_level?: 'low' | 'medium' | 'high' | 'critical' | undefined;
  source: 'framework' | 'community' | 'external';
  author?: string | undefined;
  license?: string | undefined;
  capabilities: string[];
  dependencies: SkillDependency[];
  mcp?: MCPServerConfig | undefined;
  agent_binding?: AgentBindingConfig | undefined;
  pipeline?: PipelineConfig | undefined;
  config?: Record<string, unknown> | undefined;
  migrations?: Migration[] | undefined;
}

export interface SkillDependency {
  skill: string;
  version?: string | undefined;
  optional?: boolean | undefined;
}

export interface MCPServerConfig {
  type?: 'stdio' | 'http' | 'stream' | undefined;
  server: string;
  command?: string | undefined;
  args?: string[] | undefined;
  env?: Record<string, string> | undefined;
  tools: string[];
  timeout_ms?: number | undefined;
  retry_attempts?: number | undefined;
  health_check?: {
    enabled: boolean;
    interval_ms?: number | undefined;
    endpoint?: string | undefined;
  } | undefined;
}

export interface AgentBindingConfig {
  primary: string;
  fallback?: string[] | undefined;
  auto_invoke?: boolean | undefined;
  invoke_on?: ('pre_commit' | 'pr_review' | 'manual')[] | undefined;
}

export interface PipelineConfig {
  stage: 'pre' | 'post';
  order?: number | undefined;
  required?: boolean | undefined;
  timeout_ms?: number | undefined;
}

export interface Migration {
  from_version: string;
  to_version: string;
  breaking_changes: string[];
  automated_migration?: boolean;
  notes?: string;
}

export interface SkillDiscoveryResult {
  skill: SkillManifest;
  path: string;
  source: 'local' | 'integrations';
}

export interface RegistryStats {
  total: number;
  by_source: Record<string, number>;
  by_category: Record<string, number>;
  with_mcp: number;
}
