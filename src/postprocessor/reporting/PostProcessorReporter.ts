import * as path from "path";
import { frameworkLogger } from "../../core/framework-logger.js";
import { frameworkReportingSystem } from "../../reporting/framework-reporting-system.js";
import { ReportContentValidator } from "../../validation/report-content-validator.js";
import { PostProcessorConfig, PostProcessorContext } from "../types.js";

export class PostProcessorReporter {
  constructor(
    private config: PostProcessorConfig,
    private reportValidator: ReportContentValidator,
  ) {}

  /**
   * Generate automated framework report if conditions are met
   */
  async generateFrameworkReport(
    complexityScore: number,
    context: PostProcessorContext,
    sessionId: string,
  ): Promise<string | null> {
    if (!this.config.reporting.enabled || !this.config.reporting.autoGenerate) {
      return null;
    }

    // Only generate report if complexity score meets threshold
    if (complexityScore < this.config.reporting.reportThreshold) {
      await frameworkLogger.log(
        "postprocessor",
        "report-skipped-low-complexity",
        "info",
        {
          complexityScore,
          threshold: this.config.reporting.reportThreshold,
        },
      );
      return null;
    }

    try {
      await frameworkLogger.log(
        "-post-processor",
        "-generating-automated-framework-report-",
        "info",
        { message: "📊 Generating automated framework report..." },
      );

      const reportConfig = {
        type: "full-analysis" as const,
        sessionId,
        outputFormat: "markdown" as const,
        outputPath: path.join(
          this.config.reporting.reportDir,
          `framework-report-${context.commitSha}-${new Date().toISOString().split("T")[0]}.md`,
        ),
        detailedMetrics: true,
        timeRange: { lastHours: 24 },
      };

      await frameworkReportingSystem.generateReport(reportConfig);

      await frameworkLogger.log(
        "-post-processor",
        "-framework-report-generated-reportconfig-outputpat",
        "success",
        {
          message: `✅ Framework report generated: ${reportConfig.outputPath}`,
        },
      );

      // Clean up old reports
      await this.cleanupOldReports();

      return reportConfig.outputPath;
    } catch (error) {
      await frameworkLogger.log(
        "postprocessor",
        "framework-report-generation-failed",
        "warning",
        { error: String(error) },
      );
      return null;
    }
  }

  /**
   * Validate generated reports for hidden issues
   */
  async validateGeneratedReport(
    reportPath: string,
    reportType: string,
  ): Promise<void> {
    try {
      if (this.reportValidator) {
        const validation = await this.reportValidator.validateReportContent(
          reportPath,
          reportType as any,
        );

        if (!validation.valid) {
          await frameworkLogger.log(
            "postprocessor",
            "report-validation-failed",
            "warning",
            { reportPath, issues: validation.issues },
          );

          if (validation.details.criticalErrors.length > 0) {
            await frameworkLogger.log(
              "postprocessor",
              "critical-errors-in-report",
              "error",
              { reportPath, criticalErrors: validation.details.criticalErrors },
            );
          }
        } else {
          await frameworkLogger.log(
            "postprocessor",
            "report-validation-passed",
            "success",
            { reportPath },
          );
        }
      }
    } catch (error) {
      await frameworkLogger.log(
        "postprocessor",
        "report-validation-failed",
        "warning",
        { error: String(error) },
      );
    }
  }

  /**
   * Clean up old reports based on retention policy
   */
  async cleanupOldReports(): Promise<void> {
    try {
      const fs = await import("fs");
      const path = await import("path");

      const reportDir = this.config.reporting.reportDir;
      if (!fs.existsSync(reportDir)) return;

      const files = fs.readdirSync(reportDir);
      const cutoffTime =
        Date.now() - this.config.reporting.retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(reportDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          await frameworkLogger.log(
            "postprocessor",
            "cleaned-up-old-report",
            "info",
            { file },
          );
        }
      }
    } catch (error) {
      await frameworkLogger.log(
        "postprocessor",
        "report-cleanup-failed",
        "warning",
        { error: String(error) },
      );
    }
  }
}
