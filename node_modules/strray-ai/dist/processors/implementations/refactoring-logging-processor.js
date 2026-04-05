/**
 * Refactoring Logging Processor
 *
 * Logs refactoring operations for tracking and auditing.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import * as fs from "fs";
import * as path from "path";
export class RefactoringLoggingProcessor extends PostProcessor {
    name = "refactoringLogging";
    priority = 55;
    logPath;
    constructor() {
        super();
        this.logPath = path.join(process.cwd(), "logs", "agents", "refactoring-log.md");
        this.ensureLogDirectory();
    }
    ensureLogDirectory() {
        const logDir = path.dirname(this.logPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    async run(context) {
        const ctx = context;
        const operation = ctx.operation || "modify";
        const filePath = this.getFilePath(ctx);
        await frameworkLogger.log("refactoring-logging-processor", "logging refactoring operation", "info", { operation, filePath: filePath?.slice(0, 100) });
        // Check if this is an agent task completion context
        const isAgentContext = ctx.agentName &&
            ctx.task &&
            typeof ctx.startTime === "number";
        if (!isAgentContext) {
            await frameworkLogger.log("refactoring-logging-processor", "not an agent task context, skipping log", "debug");
            return {
                logged: false,
                message: "Not an agent task completion context",
            };
        }
        try {
            const logEntry = this.createLogEntry(ctx);
            await this.appendToLog(logEntry);
            await frameworkLogger.log("refactoring-logging-processor", "refactoring operation logged successfully", "info", { agent: ctx.agentName, operation });
            return {
                logged: true,
                success: true,
                message: "Agent refactoring completion logged successfully",
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await frameworkLogger.log("refactoring-logging-processor", "refactoring logging failed", "error", { error: errorMessage });
            throw new Error(`Refactoring logging failed: ${errorMessage}`);
        }
    }
    createLogEntry(context) {
        const timestamp = new Date().toISOString();
        const startTime = context.startTime;
        const duration = Date.now() - startTime;
        const agentName = context.agentName;
        const task = context.task;
        const changes = context.changes;
        const files = context.files;
        const metrics = context.metrics;
        const complexityScore = context.complexityScore;
        let logEntry = `## Refactoring Operation - ${timestamp}\n\n`;
        logEntry += `**Agent:** ${agentName}\n`;
        logEntry += `**Task:** ${task.description || task.id || "Unknown"}\n`;
        logEntry += `**Duration:** ${duration}ms\n`;
        logEntry += `**Operation Type:** ${task.operationType || context.operationType || "refactor"}\n`;
        if (complexityScore) {
            logEntry += `**Complexity Score:** ${complexityScore}\n`;
        }
        if (changes && Array.isArray(changes)) {
            logEntry += `\n**Changes Made:**\n`;
            changes.forEach((change, index) => {
                logEntry += `${index + 1}. ${change.description || change.type || "Unknown change"}\n`;
            });
        }
        if (files && Array.isArray(files)) {
            logEntry += `\n**Files Modified:**\n`;
            files.forEach((file) => {
                logEntry += `- ${file}\n`;
            });
        }
        if (metrics) {
            logEntry += `\n**Metrics:**\n`;
            Object.entries(metrics).forEach(([key, value]) => {
                logEntry += `- ${key}: ${value}\n`;
            });
        }
        logEntry += `\n---\n\n`;
        return logEntry;
    }
    async appendToLog(entry) {
        try {
            // Check if log file exists, create header if not
            if (!fs.existsSync(this.logPath)) {
                let header = `# StringRay Framework Refactoring Log\n\n`;
                header += `This log tracks all refactoring operations performed by StringRay agents.\n\n`;
                header += `Generated on: ${new Date().toISOString()}\n\n`;
                header += `---\n\n`;
                fs.writeFileSync(this.logPath, header, "utf8");
            }
            // Append the log entry
            fs.appendFileSync(this.logPath, entry, "utf8");
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await frameworkLogger.log("refactoring-logging-processor", "failed to append to refactoring log", "error", { error: errorMessage });
            throw error;
        }
    }
}
//# sourceMappingURL=refactoring-logging-processor.js.map