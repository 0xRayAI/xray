/**
 * Publish Preflight Processor
 *
 * Post-processor that validates documentation completeness before publishing.
 * Ensures README.md, AGENTS.md, and reflection documents are up-to-date
 * before allowing npm publish.
 *
 * Configuration is read from .strray/features.json
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
import { FeaturesConfig } from "../../core/features-config.js";

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

  private config: FeaturesConfig["publish"] = {
    enabled: true,
    require_documentation: {
      enabled: true,
      required_files: ["README.md", "AGENTS.md", "CHANGELOG.md"],
      readme_version_sync: true,
    },
    require_reflection: {
      enabled: true,
      max_age_days: 7,
      auto_create_on_publish: true,
    },
    require_pipeline_tests: {
      enabled: true,
      min_pipeline_tests: 3,
    },
  };

  constructor() {
    super();
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const configPaths = [
        path.join(process.cwd(), ".strray", "features.json"),
        path.join(process.cwd(), ".opencode", "strray", "features.json"),
      ];

      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          if (configData.publish) {
            this.config = { ...this.config, ...configData.publish };
          }
          break;
        }
      }
    } catch (e) {
      frameworkLogger.log(
        "publish-preflight-processor",
        "config-load-failed",
        "warning",
        { error: e instanceof Error ? e.message : String(e) },
      );
    }
  }

  protected async run(context: ProcessorContext): Promise<unknown> {
    const projectRoot = process.cwd();

    await frameworkLogger.log(
      "publish-preflight-processor",
      "starting",
      "info",
      { operation: context.operation },
    );

    const checks: PreflightCheck[] = [];
    const pubConfig = this.config;
    const docConfig = pubConfig?.require_documentation ?? {
      enabled: true,
      required_files: ["README.md", "AGENTS.md", "CHANGELOG.md"],
      readme_version_sync: true,
    };
    const reflectionConfig = pubConfig?.require_reflection ?? {
      enabled: true,
      max_age_days: 7,
      auto_create_on_publish: true,
    };
    const pipelineConfig = pubConfig?.require_pipeline_tests ?? {
      enabled: true,
      min_pipeline_tests: 3,
    };

    // Check 1: Required documentation files exist
    if (docConfig.enabled) {
      for (const docFile of docConfig.required_files) {
        const docPath = path.join(projectRoot, docFile);
        const exists = fs.existsSync(docPath);
        checks.push({
          name: `${docFile} exists`,
          passed: exists,
          message: exists
            ? `${docFile} found`
            : `${docFile} is missing - required for publish`,
          required: true,
        });
      }
    }

    // Check 2: Required directories exist
    const reflectionsDir = path.join(projectRoot, "docs/reflections");
    const pipelineTestDir = path.join(projectRoot, "src/__tests__/pipeline");
    const reflectionsExists = fs.existsSync(reflectionsDir);
    const pipelineTestsExist = fs.existsSync(pipelineTestDir);

    checks.push({
      name: "docs/reflections exists",
      passed: reflectionsExists,
      message: reflectionsExists
        ? "docs/reflections directory found"
        : "docs/reflections directory is missing",
      required: reflectionConfig.enabled,
    });

    checks.push({
      name: "Pipeline tests directory exists",
      passed: pipelineTestsExist,
      message: pipelineTestsExist
        ? "src/__tests__/pipeline directory found"
        : "src/__tests__/pipeline directory is missing",
      required: pipelineConfig.enabled,
    });

    // Check 3: README version matches package.json
    if (docConfig.readme_version_sync) {
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
    }

    // Check 4: Latest reflection exists (within configured days)
    if (reflectionConfig.enabled && reflectionsExists) {
      const reflectionFiles = fs.readdirSync(reflectionsDir)
        .filter(f => f.endsWith(".md"))
        .map(f => ({
          name: f,
          path: path.join(reflectionsDir, f),
          mtime: fs.statSync(path.join(reflectionsDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const maxAgeMs = reflectionConfig.max_age_days * 24 * 60 * 60 * 1000;
      const latestReflection = reflectionFiles[0];
      const hasRecentReflection = latestReflection !== undefined &&
        latestReflection.mtime > (Date.now() - maxAgeMs);

      checks.push({
        name: "Recent reflection",
        passed: hasRecentReflection,
        message: hasRecentReflection
          ? `Latest reflection: ${latestReflection.name}`
          : `No reflection documents from last ${reflectionConfig.max_age_days} days - reflection required before publish`,
        required: true,
      });
    }

    // Check 5: Pipeline tests exist - must match all discoverable pipelines
    const pipelineInventoryPath = path.join(projectRoot, "docs/architecture/PIPELINE_INVENTORY.md");
    let requiredPipelineTests: number = pipelineConfig.min_pipeline_tests;
    
    if (fs.existsSync(pipelineInventoryPath)) {
      try {
        const inventory = fs.readFileSync(pipelineInventoryPath, "utf-8");
        const mainPipelineMatches = inventory.match(/### Main Pipelines \((\d+)\)/);
        
        const subPipelineSectionMatch = inventory.match(/### Sub-Pipelines[\s\S]*?(?=### |\n## |\n$)/);
        let subCount = 0;
        if (subPipelineSectionMatch) {
          const subLines = subPipelineSectionMatch[0].split('\n').filter(l => l.match(/^\|.*\*\*.*\|/));
          subCount = subLines.length;
        }
        
        if (mainPipelineMatches || subCount > 0) {
          const mainPipelineCount = mainPipelineMatches?.[1] ?? "0";
          const mainCount = parseInt(mainPipelineCount, 10);
          requiredPipelineTests = mainCount + subCount;
        }
      } catch (e) {
        frameworkLogger.log(
          "publish-preflight-processor",
          "inventory-parse-failed",
          "warning",
          { error: e instanceof Error ? e.message : String(e) },
        );
      }
    }

    if (pipelineConfig.enabled && pipelineTestsExist) {
      const testFiles = fs.readdirSync(pipelineTestDir)
        .filter(f => f.endsWith(".mjs") || f.endsWith(".test.mjs"));

      const hasEnoughTests = testFiles.length >= requiredPipelineTests;
      const requiredStr = requiredPipelineTests.toString();
      checks.push({
        name: "Pipeline tests",
        passed: hasEnoughTests,
        message: hasEnoughTests
          ? `Found ${testFiles.length} pipeline test files (required: ${requiredStr})`
          : `Only ${testFiles.length} pipeline test files - ${requiredStr} required (from PIPELINE_INVENTORY.md)`,
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
