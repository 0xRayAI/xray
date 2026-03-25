import type { SkillManifest, PipelineConfig } from "./types.js";

export interface PipelineContext {
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  startTime: number;
}

export interface PipelineResult {
  output: unknown;
  metadata?: Record<string, unknown>;
  duration: number;
  success: boolean;
  error?: string;
}

export interface SkillStageResult extends PipelineResult {
  skillName: string;
  skillVersion: string;
  toolUsed: string;
}

export class SkillPipelineStage {
  private skill: SkillManifest;
  private toolName: string;
  private timeout: number;

  constructor(skill: SkillManifest, timeout?: number) {
    this.skill = skill;
    this.timeout = timeout || skill.pipeline?.timeout_ms || 30000;
    
    const tools = skill.mcp?.tools || [];
    this.toolName = tools[0] || "default";
  }

  getSkillName(): string {
    return this.skill.name;
  }

  getToolName(): string {
    return this.toolName;
  }

  async execute(context: PipelineContext): Promise<SkillStageResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.executeSkill(context);
      
      return {
        output: result,
        metadata: {
          skill: this.skill.name,
          version: this.skill.version,
          tool: this.toolName,
        },
        duration: Date.now() - startTime,
        success: true,
        skillName: this.skill.name,
        skillVersion: this.skill.version,
        toolUsed: this.toolName,
      };
    } catch (error) {
      return {
        output: null,
        metadata: {
          skill: this.skill.name,
          version: this.skill.version,
          tool: this.toolName,
        },
        duration: Date.now() - startTime,
        success: false,
        error: String(error),
        skillName: this.skill.name,
        skillVersion: this.skill.version,
        toolUsed: this.toolName,
      };
    }
  }

  private async executeSkill(context: PipelineContext): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Skill execution timed out after ${this.timeout}ms`));
      }, this.timeout);

      try {
        resolve({
          skill: this.skill.name,
          tool: this.toolName,
          input: context.input,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        reject(error);
      } finally {
        clearTimeout(timeout);
      }
    });
  }

  getOrder(): number {
    return this.skill.pipeline?.order || 100;
  }

  isRequired(): boolean {
    return this.skill.pipeline?.required || false;
  }

  getStage(): "pre" | "post" {
    return this.skill.pipeline?.stage || "pre";
  }
}

export class SkillPipeline {
  private stages: SkillPipelineStage[] = [];
  private context: PipelineContext;

  constructor(input: Record<string, unknown>) {
    this.context = {
      input,
      startTime: Date.now(),
    };
  }

  addStage(skill: SkillManifest, timeout?: number): void {
    const stage = new SkillPipelineStage(skill, timeout);
    this.stages.push(stage);
    this.stages.sort((a, b) => a.getOrder() - b.getOrder());
  }

  async execute(): Promise<SkillStageResult[]> {
    const results: SkillStageResult[] = [];

    for (const stage of this.stages) {
      const result = await stage.execute(this.context);
      results.push(result);

      if (!result.success && stage.isRequired()) {
        break;
      }
    }

    return results;
  }

  async executePreStages(): Promise<SkillStageResult[]> {
    const preStages = this.stages.filter(s => s.getStage() === "pre");
    const results: SkillStageResult[] = [];

    for (const stage of preStages) {
      const result = await stage.execute(this.context);
      results.push(result);

      if (!result.success && stage.isRequired()) {
        break;
      }
    }

    return results;
  }

  async executePostStages(): Promise<SkillStageResult[]> {
    const postStages = this.stages.filter(s => s.getStage() === "post");
    const results: SkillStageResult[] = [];

    for (const stage of postStages) {
      const result = await stage.execute(this.context);
      results.push(result);

      if (!result.success && stage.isRequired()) {
        break;
      }
    }

    return results;
  }

  getTotalDuration(): number {
    return Date.now() - this.context.startTime;
  }
}

export function createSkillPipeline(
  skills: SkillManifest[],
  input: Record<string, unknown>,
  timeout?: number
): SkillPipeline {
  const pipeline = new SkillPipeline(input);
  
  for (const skill of skills) {
    if (skill.mcp?.tools && skill.mcp.tools.length > 0) {
      pipeline.addStage(skill, timeout);
    }
  }
  
  return pipeline;
}
