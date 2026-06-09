import { frameworkLogger } from "../../core/framework-logger.js";
import { PostProcessorContext } from "../types.js";

export class CodeChangeAnalyzer {
  async analyzeCodeChanges(context: PostProcessorContext): Promise<{
    operation: "commit";
    files: string[];
    newCode: Map<string, string>;
    existingCode: Map<string, string>;
    tests: string[];
    dependencies: string[];
  }> {
    const fs = await import("fs");
    const path = await import("path");

    const newCode = new Map<string, string>();
    const existingCode = new Map<string, string>();
    const tests: string[] = [];
    const dependencies: string[] = [];

    try {
      // Read new/changed files
      for (const file of context.files || []) {
        try {
          const fullPath = path.join(process.cwd(), file);
          if (fs.existsSync(fullPath)) {
            // Read new code
            const content = fs.readFileSync(fullPath, "utf-8");
            newCode.set(file, content);

            // Check for test files
            if (file.includes(".test.") || file.includes(".spec.")) {
              tests.push(file);
            }

            // Check for package.json or dependency files
            if (file.includes("package.json") || file.includes("requirements.txt") || file.includes("Cargo.toml")) {
              dependencies.push(file);
            }
          }
        } catch (error) {
          // Skip files that can't be read
          await frameworkLogger.log(
            "-post-processor",
            "-code-analysis-file-error",
            "info",
            { message: `Could not analyze ${file}: ${error}` },
          );
        }
      }

      await frameworkLogger.log(
        "-post-processor",
        "-code-analysis-complete",
        "info",
        {
          message: `Analyzed ${newCode.size} files, ${tests.length} tests, ${dependencies.length} dependencies`,
        },
      );
    } catch (error) {
      await frameworkLogger.log(
        "-post-processor",
        "-code-analysis-failed",
        "error",
        { message: `Code analysis failed: ${error}` },
      );
    }

    return {
      operation: "commit",
      files: context.files || [],
      newCode,
      existingCode,
      tests,
      dependencies,
    };
  }
}
