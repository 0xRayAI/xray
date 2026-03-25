import * as fs from "fs";
import type { SkillManifest, MCPServerConfig, AgentBindingConfig, PipelineConfig } from "./types.js";

export function parseYamlFrontmatter(content: string): Record<string, unknown> {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match || !match[1]) {
    return {};
  }
  
  const yamlContent = match[1];
  return parseYamlSimple(yamlContent);
}

function parseYamlSimple(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  
  interface StackItem {
    obj: Record<string, unknown>;
    indent: number;
    lastKey?: string;
  }
  
  const stack: StackItem[] = [{ obj: result, indent: -1 }];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    const indent = line.search(/\S/);
    const isArrayItem = trimmed.startsWith('- ');
    
    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }
    
    const currentItem = stack[stack.length - 1]!;
    const currentObj = currentItem.obj;
    
    if (isArrayItem) {
      const value = trimmed.slice(2).trim();
      const key = currentItem.lastKey || '_items';
      
      if (!Array.isArray(currentObj[key])) {
        currentObj[key] = [];
      }
      
      const arr = currentObj[key] as unknown[];
      if (value) {
        arr.push(value);
      }
      continue;
    }
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      
      currentItem.lastKey = key;
      
      if (value === '' || value === '[]') {
        const newObj: Record<string, unknown> = {};
        currentObj[key] = newObj;
        stack.push({ obj: newObj, indent });
      } else {
        let parsedValue: unknown = value.replace(/^["']|["']$/g, '');
        
        if (value === 'true') {
          parsedValue = true;
        } else if (value === 'false') {
          parsedValue = false;
        } else if (/^\d+$/.test(value)) {
          parsedValue = parseInt(value, 10);
        }
        
        currentObj[key] = parsedValue;
      }
    }
  }
  
  return result;
}

export function parseSkillManifest(skillMdPath: string): SkillManifest | null {
  try {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const frontmatter = parseYamlFrontmatter(content);
    
    if (!frontmatter.name || !frontmatter.description) {
      return null;
    }
    
    const name = String(frontmatter.name);
    const version = String(frontmatter.version || '1.0.0');
    const schemaVersion = String(frontmatter.schema_version || '1.0');
    const description = String(frontmatter.description);
    const source = (frontmatter.source as SkillManifest['source']) || 'framework';
    const capabilities = Array.isArray(frontmatter.capabilities) 
      ? frontmatter.capabilities.map(String)
      : [];
    const dependencies = parseDependencies(frontmatter.dependencies);
    
    const manifest: SkillManifest = {
      name,
      version,
      schema_version: schemaVersion,
      description,
      source,
      capabilities,
      dependencies,
    };
    
    if (frontmatter.category) {
      manifest.category = String(frontmatter.category);
    }
    const riskLevel = frontmatter.risk_level as string | undefined;
    if (riskLevel && ['low', 'medium', 'high', 'critical'].includes(riskLevel)) {
      manifest.risk_level = riskLevel as SkillManifest['risk_level'];
    }
    if (frontmatter.author) {
      manifest.author = String(frontmatter.author);
    }
    if (frontmatter.license) {
      manifest.license = String(frontmatter.license);
    }
    if (frontmatter.mcp) {
      manifest.mcp = parseMCPConfig(frontmatter.mcp);
    }
    if (frontmatter.agent_binding) {
      manifest.agent_binding = parseAgentBinding(frontmatter.agent_binding);
    }
    if (frontmatter.pipeline) {
      manifest.pipeline = parsePipelineConfig(frontmatter.pipeline);
    }
    if (Array.isArray(frontmatter.migrations) && frontmatter.migrations.length > 0) {
      manifest.migrations = frontmatter.migrations;
    }
    
    return manifest;
  } catch {
    return null;
  }
}

function parseDependencies(deps: unknown): SkillManifest['dependencies'] {
  if (!deps) return [];
  if (Array.isArray(deps)) {
    return deps.map(d => {
      if (typeof d === 'string') {
        return { skill: d };
      }
      return d as SkillManifest['dependencies'][0];
    });
  }
  return [];
}

function parseMCPConfig(mcp: unknown): MCPServerConfig {
  const cfg = mcp as Record<string, unknown>;
  const tools = Array.isArray(cfg.tools) ? cfg.tools.map(String) : [];
  
  const config: MCPServerConfig = {
    server: String(cfg.server || ''),
    tools,
  };
  
  if (cfg.type) {
    config.type = (cfg.type as string) as MCPServerConfig['type'];
  }
  if (cfg.command) {
    config.command = String(cfg.command);
  }
  if (cfg.args && Array.isArray(cfg.args)) {
    config.args = cfg.args.map(String);
  }
  if (cfg.env && typeof cfg.env === 'object') {
    config.env = cfg.env as Record<string, string>;
  }
  if (typeof cfg.timeout_ms === 'number') {
    config.timeout_ms = cfg.timeout_ms;
  }
  if (typeof cfg.retry_attempts === 'number') {
    config.retry_attempts = cfg.retry_attempts;
  }
  if (cfg.health_check && typeof cfg.health_check === 'object') {
    config.health_check = cfg.health_check as MCPServerConfig['health_check'];
  }
  
  return config;
}

function parseAgentBinding(binding: unknown): AgentBindingConfig {
  const b = binding as Record<string, unknown>;
  let fallback: string[] | undefined;
  
  if (Array.isArray(b.fallback)) {
    fallback = b.fallback.map(String);
  } else if (Array.isArray((b.fallback as Record<string, unknown>)?._items)) {
    fallback = ((b.fallback as Record<string, unknown>)._items as unknown[]).map(String);
  }
  
  const config: AgentBindingConfig = {
    primary: String(b.primary || ''),
  };
  
  if (fallback) {
    config.fallback = fallback;
  }
  if (typeof b.auto_invoke === 'boolean') {
    config.auto_invoke = b.auto_invoke;
  }
  
  if (b.invoke_on) {
    if (Array.isArray(b.invoke_on)) {
      config.invoke_on = b.invoke_on as AgentBindingConfig['invoke_on'];
    } else if (Array.isArray((b.invoke_on as Record<string, unknown>)?._items)) {
      config.invoke_on = ((b.invoke_on as Record<string, unknown>)._items as unknown[]).map(String) as AgentBindingConfig['invoke_on'];
    }
  }
  
  return config;
}

function parsePipelineConfig(pipeline: unknown): PipelineConfig {
  const p = pipeline as Record<string, unknown>;
  const config: PipelineConfig = {
    stage: (p.stage as PipelineConfig['stage']) || 'pre',
  };
  
  if (typeof p.order === 'number') {
    config.order = p.order;
  }
  if (typeof p.required === 'boolean') {
    config.required = p.required;
  }
  if (typeof p.timeout_ms === 'number') {
    config.timeout_ms = p.timeout_ms;
  }
  
  return config;
}
