import { getSkillRegistry, initializeSkillRegistry } from "./index.js";
import type { SkillManifest } from "./types.js";
import { frameworkLogger } from "../core/framework-logger.js";

export interface SkillMatchResult {
  skill: SkillManifest;
  matchedCapability: string;
  confidence: number;
  shouldInvoke: boolean;
  invokeReason: string;
}

export interface SkillInvokeOptions {
  autoInvoke?: boolean;
  forceInvoke?: boolean;
  minConfidence?: number;
}

export class SkillMatcher {
  private registry = getSkillRegistry();
  private initialized: boolean = false;
  
  async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.registry.initialize();
      this.initialized = true;
    }
  }
  
  async matchByTask(taskDescription: string): Promise<SkillMatchResult | null> {
    await this.ensureInitialized();
    const skills = this.registry.list();
    const normalizedTask = taskDescription.toLowerCase();
    
    let bestMatch: SkillMatchResult | null = null;
    let bestScore = 0;
    
    for (const skill of skills) {
      const score = this.calculateMatchScore(skill, normalizedTask);
      
      if (score > bestScore && score > 0.2) {
        bestScore = score;
        bestMatch = {
          skill,
          matchedCapability: this.findMatchedCapability(skill, normalizedTask),
          confidence: score,
          shouldInvoke: this.shouldInvokeSkill(skill, score),
          invokeReason: this.getInvokeReason(skill, score),
        };
      }
    }
    
    return bestMatch;
  }

  matchByName(skillName: string): SkillManifest | null {
    frameworkLogger.log("skill-matcher", "match-by-name", "info", { skillName });
    return this.registry.get(skillName) || null;
  }
  
  matchByCapability(capability: string): SkillManifest[] {
    const skills = this.registry.list();
    return skills.filter(skill => 
      skill.capabilities.some(c => 
        c.toLowerCase().includes(capability.toLowerCase())
      )
    );
  }
  
  private calculateMatchScore(skill: SkillManifest, normalizedTask: string): number {
    let score = 0;
    const taskWords = normalizedTask.split(/\s+/);
    
    // Direct name match (highest priority)
    if (skill.name.toLowerCase().includes(normalizedTask) || 
        normalizedTask.includes(skill.name.toLowerCase())) {
      score += 0.5;
    }
    
    // Description match
    if (skill.description.toLowerCase().includes(normalizedTask)) {
      score += 0.3;
    }
    
    // Capability full match
    for (const cap of skill.capabilities) {
      if (cap.toLowerCase().includes(normalizedTask)) {
        score += 0.4;
      }
    }
    
    // Word-by-word matching
    for (const word of taskWords) {
      if (word.length > 2) {
        // Check skill name parts
        if (skill.name.toLowerCase().includes(word)) {
          score += 0.2;
        }
        // Check capabilities
        for (const cap of skill.capabilities) {
          const capWords = cap.toLowerCase().split('_');
          if (capWords.some(cw => cw.includes(word) || word.includes(cw))) {
            score += 0.15;
          }
        }
        // Check description
        if (skill.description.toLowerCase().includes(word)) {
          score += 0.1;
        }
      }
    }
    
    // Boost for specific keyword matches
    const keywordBoosts: Record<string, string[]> = {
      'review': ['code-review', 'assess_quality'],
      'code': ['code-review', 'analyze_code'],
      'security': ['security-audit', 'security-scan'],
      'test': ['testing-strategy', 'testing-best-practices'],
      'performance': ['performance-optimization', 'performance-analysis'],
      'analyze': ['code-analyzer', 'project-analysis'],
      'design': ['api-design', 'architecture-patterns'],
      'api': ['api-design'],
      'architecture': ['architecture-patterns'],
      'format': ['auto-format'],
      'lint': ['auto-format'],
      'bug': ['bug-triage'],
      'triage': ['bug-triage'],
    };
    
    for (const [keyword, targets] of Object.entries(keywordBoosts)) {
      if (normalizedTask.includes(keyword)) {
        if (targets.includes(skill.name)) {
          score += 0.3;
        }
      }
    }
    
    return Math.min(score, 1.0);
  }
  
  private findMatchedCapability(skill: SkillManifest, normalizedTask: string): string {
    for (const cap of skill.capabilities) {
      if (cap.toLowerCase().includes(normalizedTask) || 
          normalizedTask.includes(cap.toLowerCase())) {
        return cap;
      }
    }
    
    for (const cap of skill.capabilities) {
      for (const word of normalizedTask.split(/\s+/)) {
        if (word.length > 2 && cap.toLowerCase().includes(word)) {
          return cap;
        }
      }
    }
    
    return skill.capabilities[0] || "general";
  }
  
  private shouldInvokeSkill(skill: SkillManifest, confidence: number): boolean {
    if (!skill.mcp || skill.mcp.tools.length === 0) {
      return false;
    }
    
    if (confidence >= 0.7) {
      return true;
    }
    
    if (skill.agent_binding?.auto_invoke) {
      return true;
    }
    
    return false;
  }
  
  private getInvokeReason(skill: SkillManifest, confidence: number): string {
    if (!skill.mcp) {
      return "Documentation-only skill";
    }
    
    if (confidence >= 0.7) {
      return `High confidence match (${Math.round(confidence * 100)}%)`;
    }
    
    if (skill.agent_binding?.auto_invoke) {
      return "Auto-invoke configured";
    }
    
    if (skill.mcp.tools.length > 0) {
      return `Has ${skill.mcp.tools.length} MCP tool(s)`;
    }
    
    return "Low confidence - manual invocation recommended";
  }
  
  getSkillsWithMCP(): SkillManifest[] {
    return this.registry.getWithMCP();
  }
  
  getSkillTools(skillName: string): string[] {
    const skill = this.registry.get(skillName);
    return skill?.mcp?.tools || [];
  }
  
  shouldAutoInvoke(skillName: string, options: SkillInvokeOptions = {}): boolean {
    const skill = this.registry.get(skillName);
    if (!skill) return false;
    
    if (options.forceInvoke) return true;
    
    if (!skill.mcp || skill.mcp.tools.length === 0) {
      return false;
    }
    
    if (skill.agent_binding?.auto_invoke) {
      return true;
    }
    
    const minConfidence = options.minConfidence ?? 0.7;
    if (options.autoInvoke && skill.mcp.tools.length > 0) {
      return true;
    }
    
    return false;
  }
}

export const skillMatcher = new SkillMatcher();

export async function matchTaskToSkill(taskDescription: string): Promise<SkillMatchResult | null> {
  return skillMatcher.matchByTask(taskDescription);
}

export async function getSkillTools(skillName: string): Promise<string[]> {
  await skillMatcher.ensureInitialized();
  return skillMatcher.getSkillTools(skillName);
}
