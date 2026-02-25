export interface ToolConfig {
  include?: string[];
  exclude?: string[];
  [key: string]: any;
}

export interface PermissionConfig {
  edit?: "ask" | "allow" | "deny";
  bash?:
    | "ask"
    | "allow"
    | "deny"
    | {
        [command: string]: "ask" | "allow" | "deny";
      };
  webfetch?: "ask" | "allow" | "deny";
  [key: string]: any;
}

export interface TaskDefinition {
  id: string;
  type: string;
  description: string;
  complexity: number;
  priority: "high" | "medium" | "low";
  createdAt: Date;
  assignedAgent?: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  dependencies?: string[];
  subagentType?: string;
}

export interface AgentConfig {
  name: string;
  model?: string;
  description: string;
  mode: "primary" | "subagent" | "all";
  system: string;
  temperature?: number;
  top_p?: number;
  tools?: ToolConfig;
  permission?: PermissionConfig;
  prompt?: string;
  prompt_append?: string;
  disable?: boolean;
  color?: string;
  capabilities: string[];
  maxComplexity: number;
  enabled: boolean;
}
