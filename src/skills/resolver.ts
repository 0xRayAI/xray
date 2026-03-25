import { getSkillRegistry, initializeSkillRegistry } from "./index.js";
import type { SkillManifest } from "./types.js";

export interface SkillResolverOptions {
  autoLoad?: boolean;
  fallbackChain?: string[];
  includeOptional?: boolean;
}

export class SkillResolver {
  private registry = getSkillRegistry();
  private resolvedSkills: Map<string, SkillManifest[]> = new Map();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.registry.initialize();
      this.initialized = true;
    }
  }

  resolveForAgent(agentName: string): SkillManifest[] {
    const skills = this.registry.list();
    const agentSkills: SkillManifest[] = [];

    for (const skill of skills) {
      if (skill.agent_binding?.primary === agentName) {
        agentSkills.push(skill);
      }

      if (skill.agent_binding?.fallback?.includes(agentName)) {
        agentSkills.push(skill);
      }
    }

    return agentSkills;
  }

  resolveBySkillName(skillName: string): SkillManifest | null {
    return this.registry.get(skillName) || null;
  }

  resolveDependencyChain(skillName: string, options: SkillResolverOptions = {}): SkillManifest[] {
    const chain: SkillManifest[] = [];
    const visited = new Set<string>();

    const resolve = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const skill = this.registry.get(name);
      if (!skill) return;

      if (options.includeOptional !== false) {
        for (const dep of skill.dependencies || []) {
          if (!dep.optional || options.includeOptional) {
            resolve(dep.skill);
          }
        }
      }

      chain.push(skill);
    };

    resolve(skillName);
    return chain;
  }

  getPrimarySkillForAgent(agentName: string): SkillManifest | null {
    const skills = this.registry.list();

    for (const skill of skills) {
      if (skill.agent_binding?.primary === agentName) {
        return skill;
      }
    }

    return null;
  }

  getAvailableSkills(): SkillManifest[] {
    return this.registry.list();
  }

  getSkillsByCategory(category: string): SkillManifest[] {
    return this.registry.getByCategory(category);
  }

  validateSkillConfig(skillName: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const skill = this.registry.get(skillName);

    if (!skill) {
      errors.push(`Skill '${skillName}' not found in registry`);
      return { valid: false, errors };
    }

    for (const dep of skill.dependencies || []) {
      if (!dep.optional) {
        const depSkill = this.registry.get(dep.skill);
        if (!depSkill) {
          errors.push(`Required dependency '${dep.skill}' not found`);
        } else if (dep.version) {
          if (!this.satisfiesVersion(depSkill.version, dep.version)) {
            errors.push(`Dependency '${dep.skill}' version mismatch: need ${dep.version}, have ${depSkill.version}`);
          }
        }
      }
    }

    if (skill.mcp) {
      if (!skill.mcp.tools || skill.mcp.tools.length === 0) {
        errors.push(`MCP configured but no tools defined`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private satisfiesVersion(have: string, need: string): boolean {
    const haveNum = parseFloat(have);
    const needNum = parseFloat(need);
    if (isNaN(haveNum) || isNaN(needNum)) return true;
    return haveNum >= needNum;
  }

  getAgentSkillSummary(): Record<string, { primary: string | null; secondary: string[] }> {
    const skills = this.registry.list();
    const summary: Record<string, { primary: string | null; secondary: string[] }> = {};

    for (const skill of skills) {
      if (skill.agent_binding) {
        const primary = skill.agent_binding.primary;
        if (!summary[primary]) {
          summary[primary] = { primary: null, secondary: [] };
        }
        if (!summary[primary].primary) {
          summary[primary].primary = skill.name;
        }
        summary[primary].secondary.push(skill.name);
      }
    }

    return summary;
  }
}

export const skillResolver = new SkillResolver();

export async function resolveAgentSkills(agentName: string): Promise<SkillManifest[]> {
  await skillResolver.initialize();
  return skillResolver.resolveForAgent(agentName);
}

export async function resolveSkillDependencies(skillName: string): Promise<SkillManifest[]> {
  await skillResolver.initialize();
  return skillResolver.resolveDependencyChain(skillName);
}
