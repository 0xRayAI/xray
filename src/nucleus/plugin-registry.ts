/**
 * PluginRegistry — Phase 1.2 dynamic skill loading
 *
 * Allows skills to be registered after boot, loaded from config, or discovered
 * at runtime. Wraps the existing in-process-skill-registry for backward compat.
 *
 * Goals:
 * - New skills can be registered post-boot via register()
 * - Skills are discoverable by name without importing server constructors
 * - Default set loads automatically from the existing 3 governance skills
 * - Backward compatible: callInProcessSkill still works as before
 */

import { callInProcessSkill } from '../mcps/in-process-skill-registry.js';
import { frameworkLogger } from '../core/framework-logger.js';

export interface SkillPlugin {
  /** Unique skill name (e.g. "code-review", "security-audit") */
  name: string;
  /** Handler that processes proposals */
  analyzeProposal(args: SkillProposalArgs): Promise<SkillPluginResult>;
}

export interface SkillProposalArgs {
  proposalTitle?: string;
  proposalDescription?: string;
  evidence?: string[];
  proposalType?: string;
}

export interface SkillPluginResult {
  content: Array<{ type: string; text: string }>;
}

type SkillHandler = (args: SkillProposalArgs) => Promise<SkillPluginResult>;

class PluginRegistryImpl {
  private skills = new Map<string, SkillHandler>();
  private initialized = false;

  /**
   * Register a skill plugin. Can be called after boot.
   */
  register(skill: SkillPlugin): void {
    if (this.skills.has(skill.name)) {
      frameworkLogger.log('plugin-registry', 'register-overwrite', 'warning', {
        skillName: skill.name,
        message: 'Overwriting existing skill registration',
      });
    }
    this.skills.set(skill.name, (args) => skill.analyzeProposal(args));
    frameworkLogger.log('plugin-registry', 'register', 'info', {
      skillName: skill.name,
      totalSkills: this.skills.size,
    });
  }

  /**
   * Get a skill handler by name. Falls back to the in-process registry
   * for the built-in governance skills (code-review, security-audit, researcher).
   */
  get(name: string): SkillHandler | undefined {
    const handler = this.skills.get(name);
    if (handler) return handler;

    // Fall back to the built-in registry for the 3 governance skills
    const builtInNames = ['code-review', 'security-audit', 'researcher'];
    if (builtInNames.includes(name)) {
      return async (args: SkillProposalArgs) => {
        const result = await callInProcessSkill(name, 'analyze_proposal', args as Record<string, unknown>);
        return result as SkillPluginResult;
      };
    }

    return undefined;
  }

  /**
   * Check if a skill is registered (either in the plugin registry or the built-in registry).
   */
  has(name: string): boolean {
    return this.skills.has(name) || ['code-review', 'security-audit', 'researcher'].includes(name);
  }

  /**
   * List all registered skill names (plugins + built-in).
   */
  list(): string[] {
    const builtIn = ['code-review', 'security-audit', 'researcher'];
    const pluginNames = Array.from(this.skills.keys());
    return [...new Set([...builtIn, ...pluginNames])];
  }

  /**
   * Call a skill by name. Delegates to the plugin registry first,
   * then falls back to the built-in in-process registry.
   */
  async callSkill(name: string, args: SkillProposalArgs): Promise<SkillPluginResult> {
    const handler = this.get(name);
    if (!handler) {
      throw new Error(`No skill registered: ${name}. Available: ${this.list().join(', ')}`);
    }
    return handler(args);
  }

  /**
   * Initialize with default governance skills. Called once at boot.
   * The 3 governance skills are always available via the built-in registry.
   */
  initializeDefaults(): void {
    if (this.initialized) return;
    this.initialized = true;
    frameworkLogger.log('plugin-registry', 'initialize-defaults', 'info', {
      builtInSkills: ['code-review', 'security-audit', 'researcher'],
      message: 'Default governance skills available via built-in registry',
    });
  }

  /**
   * Reset the registry for testing. Removes all registered plugins
   * (built-in governance skills remain available via fallback).
   */
  resetForTest(): void {
    this.skills.clear();
    this.initialized = false;
  }
}

/** Singleton plugin registry */
export const pluginRegistry = new PluginRegistryImpl();