import * as fs from "fs";
import * as path from "path";
import { SkillDiscoveryService } from "./discovery.js";
import type { SkillManifest, RegistryStats, SkillDiscoveryResult } from "./types.js";
import { frameworkLogger } from "../core/framework-logger.js";

export class SkillRegistry {
  private skills: Map<string, SkillManifest> = new Map();
  private paths: Map<string, string> = new Map();
  private discoveryService: SkillDiscoveryService;
  private directory: string;
  private cachePath: string;
  private initialized: boolean = false;
  
  constructor(directory: string = process.cwd()) {
    this.directory = directory;
    this.cachePath = path.join(directory, ".opencode", "logs", "skill-registry-cache.json");
    this.discoveryService = new SkillDiscoveryService(directory);
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    if (fs.existsSync(this.cachePath)) {
      try {
        const cache = JSON.parse(fs.readFileSync(this.cachePath, "utf-8"));
        if (cache.skills) {
          for (const [name, skill] of Object.entries(cache.skills)) {
            this.skills.set(name, skill as SkillManifest);
          }
        }
        if (cache.paths) {
          for (const [name, p] of Object.entries(cache.paths)) {
            this.paths.set(name, p as string);
          }
        }
        this.initialized = true;
        return;
      } catch {
        // Cache invalid, will rebuild
      }
    }
    
    await this.rebuild();
    this.initialized = true;
    frameworkLogger.log("skill-registry", "initialize", "info", {
      count: this.skills.size,
    });
  }
  
  async rebuild(): Promise<void> {
    this.skills.clear();
    this.paths.clear();
    
    frameworkLogger.log("skill-registry", "rebuild", "info", { phase: "start" });
    
    const discovered = await this.discoveryService.discover();
    
    for (const result of discovered) {
      this.skills.set(result.skill.name, result.skill);
      this.paths.set(result.skill.name, result.path);
    }
    
    frameworkLogger.log("skill-registry", "rebuild", "info", {
      phase: "complete",
      count: this.skills.size,
    });
    
    await this.persist();
  }
  
  private async persist(): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cachePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      const cache: Record<string, unknown> = {
        skills: Object.fromEntries(this.skills),
        paths: Object.fromEntries(this.paths),
        timestamp: new Date().toISOString(),
      };
      
      fs.writeFileSync(this.cachePath, JSON.stringify(cache, null, 2), "utf-8");
    } catch {
      // Silent fail - cache is optional
    }
  }
  
  get(name: string): SkillManifest | undefined {
    return this.skills.get(name);
  }
  
  getPath(name: string): string | undefined {
    return this.paths.get(name);
  }
  
  has(name: string): boolean {
    return this.skills.has(name);
  }
  
  list(): SkillManifest[] {
    return Array.from(this.skills.values());
  }
  
  names(): string[] {
    return Array.from(this.skills.keys());
  }
  
  count(): number {
    return this.skills.size;
  }
  
  add(skill: SkillManifest, skillPath: string): void {
    this.skills.set(skill.name, skill);
    this.paths.set(skill.name, skillPath);
  }
  
  remove(name: string): boolean {
    const existed = this.skills.has(name);
    this.skills.delete(name);
    this.paths.delete(name);
    return existed;
  }
  
  getBySource(source: SkillManifest['source']): SkillManifest[] {
    return this.list().filter(s => s.source === source);
  }
  
  getByCategory(category: string): SkillManifest[] {
    return this.list().filter(s => s.category === category);
  }
  
  getWithMCP(): SkillManifest[] {
    return this.list().filter(s => s.mcp !== undefined);
  }
  
  getStats(): RegistryStats {
    const skills = this.list();
    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let withMcp = 0;
    
    for (const skill of skills) {
      bySource[skill.source] = (bySource[skill.source] || 0) + 1;
      
      if (skill.category) {
        byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
      }
      
      if (skill.mcp) {
        withMcp++;
      }
    }
    
    return {
      total: skills.length,
      by_source: bySource,
      by_category: byCategory,
      with_mcp: withMcp,
    };
  }
  
  async refresh(): Promise<void> {
    await this.rebuild();
  }
}

let globalRegistry: SkillRegistry | null = null;

export function getSkillRegistry(directory?: string): SkillRegistry {
  if (!globalRegistry) {
    globalRegistry = new SkillRegistry(directory || process.cwd());
  }
  return globalRegistry;
}

export async function initializeSkillRegistry(directory?: string): Promise<SkillRegistry> {
  const registry = getSkillRegistry(directory);
  await registry.initialize();
  return registry;
}
