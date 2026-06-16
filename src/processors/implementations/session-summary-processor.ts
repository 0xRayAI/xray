/**
 * Session Summary Post-Processor
 *
 * Generates emoji-formatted session summaries after tool execution.
 * Uses features.json -> auto_reporting config for control.
 *
 * @version 1.0.0
 * @since 2026-04-04
 */

import { PostProcessor, ProcessorContext } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import { featuresConfigLoader } from "../../core/features-config.js";

interface SessionSummaryConfig {
  enabled: boolean;
  include_emojis: boolean;
  include_recommendations: boolean;
  include_agent_activities: boolean;
}

export class SessionSummaryProcessor extends PostProcessor {
  readonly name = "sessionSummary";
  readonly priority = 15;
  
  private config: SessionSummaryConfig = {
    enabled: true,
    include_emojis: true,
    include_recommendations: true,
    include_agent_activities: true,
  };

  private sessionStartTime: number = Date.now();
  private agentActivities: Map<string, number> = new Map();
  private toolCalls: Map<string, number> = new Map();
  private operations: string[] = [];

  constructor() {
    super();
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const configData = featuresConfigLoader.loadConfig() as any;
      const autoReporting = configData.auto_reporting;
      
      if (autoReporting) {
        this.config.enabled = autoReporting.mode !== "off";
        this.config.include_emojis = autoReporting.display?.indicators?.emojis !== false;
        this.config.include_recommendations = autoReporting.report_types?.session_summary?.include_recommendations !== false;
        this.config.include_agent_activities = autoReporting.report_types?.session_summary?.include_agent_activities !== false;
      }
    } catch (error) {
      // Silent fail - use defaults
    }
  }

  async run(context: ProcessorContext): Promise<unknown> {
    if (!this.config.enabled) {
      return { summaryGenerated: false, reason: "disabled in features.json" };
    }

    // Track operation
    const operation = context.operation || context.data as string || "unknown";
    this.operations.push(operation);
    
    // Track tool calls
    const tool = context.operation || "unknown";
    this.toolCalls.set(tool, (this.toolCalls.get(tool) || 0) + 1);
    
    // Track agent if available
    const agentName = (context as any).agentName;
    if (agentName) {
      this.agentActivities.set(agentName, (this.agentActivities.get(agentName) || 0) + 1);
    }

    // Generate summary on triggers
    const shouldSummarize = this.shouldGenerateSummary(context);
    
    if (shouldSummarize) {
      const summary = this.generateEmojiSummary(context);
      frameworkLogger.log(
        "sessionSummary",
        "session-summary-output",
        "info",
        { summary },
      );
      
      frameworkLogger.log(
        "sessionSummary",
        "session-summary-generated",
        "info",
        { summary: this.stripEmojis(summary), operationCount: this.operations.length }
      );
      
      return { summaryGenerated: true, summary };
    }

    return { summaryGenerated: false };
  }

  private shouldGenerateSummary(context: ProcessorContext): boolean {
    const isPublish = (context as any).metadata?.isPublishing;
    const operationCount = this.operations.length;
    const isError = !(context as any).success;
    
    return isPublish || (operationCount > 0 && operationCount % 5 === 0) || isError;
  }

  private generateEmojiSummary(context: ProcessorContext): string {
    const emojis = this.config.include_emojis;
    const ops = this.operations.length;
    const duration = Date.now() - this.sessionStartTime;
    
    const prefix = emojis ? "🎯" : ">";
    const separator = emojis ? "━━━━━━━━━━━━━━━━━━" : "===============";
    const toolIcon = emojis ? "🛠️" : "Tools:";
    const agentIcon = emojis ? "🤖" : "Agents:";
    const recIcon = emojis ? "📝" : "Note:";
    
    let summary = `\n${prefix} Session Summary (${ops} ops, ${(duration/1000).toFixed(1)}s)\n${separator}\n`;
    
    // Top tools
    if (this.toolCalls.size > 0) {
      const topTools = Array.from(this.toolCalls.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t, c]) => `${t}(${c})`)
        .join(", ");
      summary += `${toolIcon} ${topTools}\n`;
    }
    
    // Agents
    if (this.config.include_agent_activities && this.agentActivities.size > 0) {
      summary += `${agentIcon} ${Array.from(this.agentActivities.keys()).join(", ")}\n`;
    }
    
    // Last operation status
    const lastOp = this.operations[this.operations.length - 1] || "unknown";
    const status = (context as any).success !== false ? "✅" : "❌";
    summary += `${status} Last: ${lastOp}\n`;
    
    // Recommendation
    if (this.config.include_recommendations && ops >= 3) {
      summary += `${recIcon} ${this.generateRecommendation()}\n`;
    }
    
    summary += `${separator}\n`;
    
    return summary;
  }

  private generateRecommendation(): string {
    const editCount = this.toolCalls.get("edit") || 0;
    const writeCount = this.toolCalls.get("write") || 0;
    
    if (editCount > 5) return "Heavy edits - consider running tests";
    if (writeCount > 10) return "Many writes - good time for a commit";
    return "Session progressing well";
  }

  private stripEmojis(text: string): string {
    return text.replace(/🎯|🛠️|🤖|✅|❌|📝|━━━━━━━━━━━━━━━━━━|===============/g, "").trim();
  }
}

export default SessionSummaryProcessor;