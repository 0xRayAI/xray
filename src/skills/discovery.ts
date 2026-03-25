import * as fs from "fs";
import * as path from "path";
import { parseSkillManifest } from "./parser.js";
import type { SkillManifest, SkillDiscoveryResult } from "./types.js";

export const SKILL_SEARCH_PATHS = [
  ".opencode/skills/",
  ".opencode/integrations/",
];

export class SkillDiscoveryService {
  private directory: string;
  
  constructor(directory: string = process.cwd()) {
    this.directory = directory;
  }
  
  async discover(): Promise<SkillDiscoveryResult[]> {
    const skills: SkillDiscoveryResult[] = [];
    
    for (const pattern of SKILL_SEARCH_PATHS) {
      const skillResults = await this.discoverFromPath(pattern);
      skills.push(...skillResults);
    }
    
    return skills;
  }
  
  async discoverFromPath(relativePath: string): Promise<SkillDiscoveryResult[]> {
    const results: SkillDiscoveryResult[] = [];
    const fullPath = path.join(this.directory, relativePath);
    
    if (!fs.existsSync(fullPath)) {
      return results;
    }
    
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      
      const skillDir = path.join(fullPath, entry.name);
      const skillMdPath = path.join(skillDir, "SKILL.md");
      
      if (!fs.existsSync(skillMdPath)) {
        continue;
      }
      
      const manifest = parseSkillManifest(skillMdPath);
      if (!manifest) {
        continue;
      }
      
      const source: SkillDiscoveryResult['source'] = relativePath.includes("integrations")
        ? "integrations"
        : "local";
      
      results.push({
        skill: manifest,
        path: skillMdPath,
        source,
      });
    }
    
    return results;
  }
  
  async discoverSkill(name: string): Promise<SkillDiscoveryResult | null> {
    for (const pattern of SKILL_SEARCH_PATHS) {
      const skillPath = path.join(this.directory, pattern, name, "SKILL.md");
      
      if (fs.existsSync(skillPath)) {
        const manifest = parseSkillManifest(skillPath);
        if (manifest) {
          return {
            skill: manifest,
            path: skillPath,
            source: pattern.includes("integrations") ? "integrations" : "local",
          };
        }
      }
    }
    
    return null;
  }
  
  getSkillPath(name: string, source: 'local' | 'integrations' = 'local'): string {
    const basePath = source === 'integrations'
      ? ".opencode/integrations/"
      : ".opencode/skills/";
    return path.join(this.directory, basePath, name, "SKILL.md");
  }
}
