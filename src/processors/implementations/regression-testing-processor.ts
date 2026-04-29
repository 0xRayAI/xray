import * as fs from "fs";
import * as path from "path";
import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
import { frameworkLogger } from "../../core/framework-logger.js";

interface RegressionResult {
  regressions: number;
  issues: RegressionIssue[];
  baseline: string | null;
  current: string | null;
}

interface RegressionIssue {
  type: "new_failure" | "coverage_drop" | "performance_degradation";
  description: string;
  file?: string;
}

export class RegressionTestingProcessor extends PostProcessor {
  readonly name = "regressionTesting";
  readonly priority = 15;

  protected async run(context: ProcessorContext): Promise<RegressionResult> {
    const result: RegressionResult = {
      regressions: 0,
      issues: [],
      baseline: null,
      current: null,
    };

    try {
      const projectRoot = process.cwd();
      const testCountPath = path.join(
        projectRoot,
        ".opencode",
        "strray",
        "test-count.json",
      );

      if (!fs.existsSync(testCountPath)) {
        frameworkLogger.log(
          "regression-testing-processor",
          "no-baseline",
          "info",
          { message: "No test-count.json baseline found" },
        );
        return result;
      }

      const baseline = JSON.parse(
        fs.readFileSync(testCountPath, "utf-8"),
      );
      result.baseline = `${baseline.totalTests ?? "unknown"} tests`;

      const currentCount = this.getCurrentTestCount(projectRoot);
      result.current = `${currentCount} tests`;

      if (
        baseline.totalTests &&
        currentCount > 0 &&
        currentCount < baseline.totalTests * 0.9
      ) {
        result.regressions += 1;
        result.issues.push({
          type: "new_failure",
          description: `Test count dropped from ${baseline.totalTests} to ${currentCount} (>10% regression)`,
        });
      }

      if (result.regressions > 0) {
        frameworkLogger.log(
          "regression-testing-processor",
          "regressions-detected",
          "warning",
          { regressions: result.regressions, issues: result.issues },
        );
      } else {
        frameworkLogger.log(
          "regression-testing-processor",
          "no-regressions",
          "info",
          { baseline: result.baseline, current: result.current },
        );
      }
    } catch (error) {
      frameworkLogger.log(
        "regression-testing-processor",
        "error",
        "error",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }

    return result;
  }

  private getCurrentTestCount(projectRoot: string): number {
    try {
      const testCountPath = path.join(
        projectRoot,
        ".opencode",
        "strray",
        "test-count.json",
      );
      if (!fs.existsSync(testCountPath)) return 0;
      const data = JSON.parse(fs.readFileSync(testCountPath, "utf-8"));
      return data.totalTests ?? 0;
    } catch {
      return 0;
    }
  }
}
