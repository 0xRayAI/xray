/**
 * Publish Preflight Processor
 *
 * Post-processor that validates documentation completeness before publishing.
 * Ensures README.md, AGENTS.md, and reflection documents are up-to-date
 * before allowing npm publish.
 *
 * @processor_type post
 * @priority 10 (runs early after post-processing starts)
 * @blocking true (blocks publish on violations)
 *
 * @version 1.0.0
 * @framework StringRay 1.15.41
 */

import * as fs from "fs";
import * as path from "path";
import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import { ProcessorContext, ProcessorResult } from "../processor-types.js";

export interface PreflightResult {
  compliant: boolean;
  checks: PreflightCheck[];
  summary: string;
}

export interface PreflightCheck {
  name: string;
  passed: boolean;
  message: string;
  required: boolean;
}

export class PublishPreflightProcessor extends PostProcessor {
  readonly name = "publishPreflight";
  readonly priority = 10;

  private readonly requiredDocs = [
    { name: "README.md", path: "README.md" },
    { name: "AGENTS.md", path: "AGENTS.md" },
    { name: "CHANGELOG.md", path: "CHANGELOG.md" },
  ];

  private readonly requiredDirs = [
    { name: "docs/reflections", path: "docs/reflections" },
    { name: "Pipeline tests", path: "src/__tests__/pipeline" },
  ];

  protected async run(context: ProcessorContext): Promise<unknown> {
    const projectRoot = process.cwd();

    await frameworkLogger.log(
      "publish-preflight-processor",
      "starting",
      "info",
      { operation: context.operation },
    );

    const checks: PreflightCheck[] = [];

    // Check 1: Required documentation files exist
    for (const doc of this.requiredDocs) {
      const docPath = path.join(projectRoot, doc.path);
      const exists = fs.existsSync(docPath);
      checks.push({
        name: `${doc.name} exists`,
        passed: exists,
        message: exists
          ? `${doc.name} found`
          : `${doc.name} is missing - required for publish`,
        required: true,
      });
    }

    // Check 2: Required directories exist
    for (const dir of this.requiredDirs) {
      const dirPath = path.join(projectRoot, dir.path);
      const exists = fs.existsSync(dirPath);
      checks.push({
        name: `${dir.name} exists`,
        passed: exists,
        message: exists
          ? `${dir.name} directory found`
          : `${dir.name} directory is missing - required for publish`,
        required: true,
      });
    }

    // Check 3: README version matches package.json
    const pkgPath = path.join(projectRoot, "package.json");
    const readmePath = path.join(projectRoot, "README.md");
    if (fs.existsSync(pkgPath) && fs.existsSync(readmePath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const readme = fs.readFileSync(readmePath, "utf-8");
        const pkgVersion = pkg.version;

        const readmeHasVersion = readme.includes(pkgVersion);
        checks.push({
          name: "README version sync",
          passed: readmeHasVersion,
          message: readmeHasVersion
            ? `README references version ${pkgVersion}`
            : `README does not reference current version ${pkgVersion}`,
          required: false,
        });
      } catch (e) {
        checks.push({
          name: "README version sync",
          passed: false,
          message: "Could not verify README version sync",
          required: false,
        });
      }
    }

    // Check 4: Latest reflection exists (within last 7 days)
    const reflectionsDir = path.join(projectRoot, "docs/reflections");
    if (fs.existsSync(reflectionsDir)) {
      const reflectionFiles = fs.readdirSync(reflectionsDir)
        .filter(f => f.endsWith(".md"))
        .map(f => ({
          name: f,
          path: path.join(reflectionsDir, f),
          mtime: fs.statSync(path.join(reflectionsDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const latestReflection = reflectionFiles[0];
      const hasRecentReflection = latestReflection !== undefined &&
        latestReflection.mtime > sevenDaysAgo;

      checks.push({
        name: "Recent reflection",
        passed: hasRecentReflection,
        message: hasRecentReflection
          ? `Latest reflection: ${latestReflection.name}`
          : "No reflection documents from last 7 days - reflection required before publish",
        required: true,
      });
    } else {
      checks.push({
        name: "Recent reflection",
        passed: false,
        message: "docs/reflections directory missing",
        required: true,
      });
    }

    // Check 5: Pipeline tests exist
    const pipelineTestDir = path.join(projectRoot, "src/__tests__/pipeline");
    if (fs.existsSync(pipelineTestDir)) {
      const testFiles = fs.readdirSync(pipelineTestDir)
        .filter(f => f.endsWith(".mjs") || f.endsWith(".test.mjs"));

      const hasPipelineTests = testFiles.length >= 3;
      checks.push({
        name: "Pipeline tests",
        passed: hasPipelineTests,
        message: hasPipelineTests
          ? `Found ${testFiles.length} pipeline test files`
          : `Only ${testFiles.length} pipeline test files - at least 3 required`,
        required: true,
      });
    } else {
      checks.push({
        name: "Pipeline tests",
        passed: false,
        message: "Pipeline test directory missing",
        required: true,
      });
    }

    // Determine overall compliance
    const failedRequired = checks.filter(c => c.required && !c.passed);
    const compliant = failedRequired.length === 0;

    const summary = compliant
      ? "✅ All preflight checks passed"
      : `❌ ${failedRequired.length} required check(s) failed: ${failedRequired.map(c => c.name).join(", ")}`;

    if (!compliant) {
      await frameworkLogger.log(
        "publish-preflight-processor",
        "failed",
        "error",
        { failedChecks: failedRequired.map(c => c.name) },
      );
    }

    return {
      compliant,
      checks,
      summary,
      checkedAt: new Date().toISOString(),
    } as PreflightResult;
  }

  async execute(context: ProcessorContext): Promise<ProcessorResult> {
    const startTime = Date.now();
    const result = await this.run(context) as PreflightResult;
    const duration = Date.now() - startTime;

    if (!result.compliant) {
      const failedChecks = result.checks
        .filter(c => c.required && !c.passed)
        .map(c => c.message)
        .join("; ");

      return {
        success: false,
        error: `Publish preflight failed: ${failedChecks}`,
        data: result,
        duration,
        processorName: this.name,
      };
    }

    return {
      success: true,
      data: result,
      duration,
      processorName: this.name,
    };
  }
}
