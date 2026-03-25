import * as fs from "fs";
import * as path from "path";
import { parseSkillManifest } from "./parser.js";
import type { SkillManifest, SkillDiscoveryResult } from "./types.js";
import { frameworkLogger } from "../core/framework-logger.js";

export const SKILL_SEARCH_PATHS = [
  ".opencode/skills/",
];

export class SkillDiscoveryService {
  private directory: string;
  
  constructor(directory: string = process.cwd()) {
    this.directory = directory;
  }
  
  async discover(): Promise<SkillDiscoveryResult[]> {
    const skills: SkillDiscoveryResult[] = [];
    
    frameworkLogger.log("skill-discovery", "discover", "info", {
      paths: SKILL_SEARCH_PATHS,
    });

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
      
      results.push({
        skill: manifest,
        path: skillMdPath,
        source: "local" as SkillDiscoveryResult['source'],
      });
    }

    frameworkLogger.log("skill-discovery", "discover-path", "info", {
      path: relativePath,
      found: results.length,
    });

    return results;
  }
  
  async discoverSkill(name: string): Promise<SkillDiscoveryResult | null> {
    const skillPath = path.join(this.directory, ".opencode", "skills", name, "SKILL.md");
    
    if (fs.existsSync(skillPath)) {
      const manifest = parseSkillManifest(skillPath);
      if (manifest) {
        return {
          skill: manifest,
          path: skillPath,
          source: "local",
        };
      }
    }
    
    return null;
  }
  
  getSkillPath(name: string): string {
    return path.join(this.directory, ".opencode", "skills", name, "SKILL.md");
  }
}
