/**
 * Estimation MCP Server
 * 
 * Provides tools for tracking and validating estimates
 */

import { frameworkLogger } from "../core/framework-logger.js";
import { getEstimationValidator } from "../validation/estimation-validator.js";
import { XrayKnowledgeSkillBase } from "./shared/knowledge-skill-base.js";

/**
 * Estimation MCP Server
 * Tracks estimates vs actuals and provides calibrated predictions
 */
class EstimationServer extends XrayKnowledgeSkillBase {
  private validator = getEstimationValidator();

  constructor() {
    super("estimation-validator", "2.0.1");
    this.tools = [
      {
        name: "validate-estimate",
        description: "Validate an estimate against historical data",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Task category (e.g., 'refactoring', 'testing', 'documentation')",
            },
            estimate: {
              type: "number",
              description: "Estimated time in minutes",
            },
            description: {
              type: "string",
              description: "Brief description of the task",
            },
          },
          required: ["category", "estimate"],
        },
      },
      {
        name: "start-tracking",
        description: "Start tracking time for a task",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            category: { type: "string" },
            estimate: { type: "number" },
            description: { type: "string" },
          },
          required: ["taskId", "category", "estimate"],
        },
      },
      {
        name: "complete-tracking",
        description: "Complete tracking for a task",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "string" },
          },
          required: ["taskId"],
        },
      },
      {
        name: "get-accuracy-report",
        description: "Get estimation accuracy report",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ];
    this.handlers = {
      "validate-estimate": async (args) => this.handleValidateEstimate(args as { category: string; estimate: number; description?: string }),
      "start-tracking": async (args) => this.handleStartTracking(args as { taskId: string; category: string; estimate: number; description?: string }),
      "complete-tracking": async (args) => this.handleCompleteTracking(args as { taskId: string }),
      "get-accuracy-report": async (args) => this.handleGetReport(),
    };
    this.setupToolHandlers();
  }

  private handleValidateEstimate(args: { category: string; estimate: number; description?: string }): { content: Array<{ type: string; text: string }> } {
    const validation = this.validator.validateEstimate(args.category, args.estimate);
    
    const calibrated = this.validator.getCalibratedEstimate(args.category, args.estimate);

    let response = `📊 Estimate Validation: ${args.description || args.category}\n\n`;
    response += `Your estimate: ${args.estimate} minutes\n`;
    response += `Calibrated estimate: ${calibrated.calibratedEstimate} minutes (${Math.round(calibrated.calibrationFactor * 100)}% of estimate)\n`;
    response += `Confidence: ${Math.round(calibrated.confidence * 100)}%\n\n`;

    if (!validation.isReasonable) {
      response += `⚠️ ${validation.warning}\n\n`;
      response += `Suggested: ${validation.suggestedEstimate} minutes\n`;
    } else if (validation.warning) {
      response += `ℹ️ ${validation.warning}\n`;
    } else {
      response += `✅ Estimate looks reasonable based on historical data.\n`;
    }

    return { content: [{ type: "text", text: response }] };
  }

  private handleStartTracking(args: { taskId: string; category: string; estimate: number; description?: string }): { content: Array<{ type: string; text: string }> } {
    this.validator.startEstimate(
      args.taskId,
      args.description || args.taskId,
      args.category,
      args.estimate
    );

    return {
      content: [{
        type: "text",
        text: `⏱️ Started tracking "${args.taskId}"\nCategory: ${args.category}\nEstimated: ${args.estimate} minutes`,
      }],
    };
  }

  private handleCompleteTracking(args: { taskId: string }): { content: Array<{ type: string; text: string }> } {
    this.validator.completeEstimate(args.taskId);

    return {
      content: [{
        type: "text",
        text: `✅ Completed tracking "${args.taskId}"\nTime recorded and calibration updated.`,
      }],
    };
  }

  private handleGetReport(): { content: Array<{ type: string; text: string }> } {
    const report = this.validator.getAccuracyReport();

    let response = `📈 Estimation Accuracy Report\n\n`;
    response += `Overall Accuracy: ${Math.round(report.overallAccuracy * 100)}%\n\n`;

    if (report.categoryBreakdown.length > 0) {
      response += `Category Breakdown:\n`;
      for (const cat of report.categoryBreakdown) {
        const emoji = cat.trend === 'under' ? '🐌' : cat.trend === 'over' ? '⚡' : '✅';
        response += `${emoji} ${cat.category}: ${cat.sampleSize} samples, avg ratio ${cat.avgRatio.toFixed(2)}\n`;
      }
      response += `\n`;
    }

    if (report.recommendations.length > 0) {
      response += `Recommendations:\n`;
      for (const rec of report.recommendations) {
        response += `• ${rec}\n`;
      }
    } else {
      response += `✅ Your estimates are well-calibrated!\n`;
    }

    return { content: [{ type: "text", text: response }] };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new EstimationServer();
  server.run("estimation-validator").catch((error) => frameworkLogger.log("mcps/estimation", "run", "error", { error: String(error) }));
}

export { EstimationServer };
