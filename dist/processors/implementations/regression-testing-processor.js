/**
 * Regression Testing Processor
 *
 * Executes regression tests after file modifications to ensure
 * existing functionality is not broken.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class RegressionTestingProcessor extends PostProcessor {
    name = "regressionTesting";
    priority = 50;
    async run(context) {
        const filePath = context.filePath || context.toolInput?.args?.filePath;
        const operation = context.operation || context.toolInput?.args?.operation;
        if (!filePath) {
            return { success: true, message: "no file path specified" };
        }
        frameworkLogger.log("regression-testing-processor", "execution-started", "info", { filePath, operation });
        const result = await this.runRegressionTests(filePath);
        if (result.passed) {
            frameworkLogger.log("regression-testing-processor", "tests-passed", "info", { filePath, testsRun: result.testsRun, duration: result.duration });
            return {
                success: true,
                duration: result.duration,
                processorName: this.name,
                data: {
                    testsRun: result.testsRun,
                    passed: true,
                    duration: result.duration,
                    message: `Regression tests passed: ${result.testsRun} tests in ${result.duration}ms`,
                },
            };
        }
        else {
            frameworkLogger.log("regression-testing-processor", "tests-failed", "error", { filePath, failures: result.failures, errors: result.errors });
            return {
                success: false,
                duration: result.duration,
                processorName: this.name,
                data: {
                    testsRun: result.testsRun,
                    failures: result.failures,
                    errors: result.errors || [],
                    duration: result.duration,
                    message: `Regression tests failed: ${result.failures} failures`,
                },
            };
        }
    }
    async runRegressionTests(filePath) {
        const testFiles = this.findRelatedTestFiles(filePath);
        if (testFiles.length === 0) {
            return {
                passed: true,
                testsRun: 0,
                failures: 0,
                duration: 0,
                errors: [],
            };
        }
        const startTime = Date.now();
        let totalTests = 0;
        let totalFailures = 0;
        const errors = [];
        for (const testFile of testFiles) {
            try {
                const testResult = await this.executeTestFile(testFile);
                totalTests += testResult.tests;
                totalFailures += testResult.failures;
                if (testResult.errors.length > 0) {
                    errors.push(...testResult.errors);
                }
            }
            catch (error) {
                errors.push(`Failed to run ${testFile}: ${error instanceof Error ? error.message : String(error)}`);
                totalFailures++;
            }
        }
        const duration = Date.now() - startTime;
        return {
            passed: totalFailures === 0,
            testsRun: totalTests,
            failures: totalFailures,
            duration,
            errors: errors.length > 0 ? errors : [],
        };
    }
    findRelatedTestFiles(filePath) {
        const testExtensions = [".test.ts", ".spec.ts", ".test.js", ".spec.js"];
        const baseName = filePath.replace(/\.(ts|js)$/, "");
        const relatedFiles = [];
        for (const ext of testExtensions) {
            const testPath = `${baseName}${ext}`;
            relatedFiles.push(testPath);
        }
        return relatedFiles;
    }
    async executeTestFile(testFile) {
        return new Promise((resolve) => {
            try {
                const { execSync } = require("child_process");
                const result = execSync(`npx vitest run --reporter=json ${testFile}`, {
                    encoding: "utf-8",
                    timeout: 60000,
                });
                try {
                    const jsonResult = JSON.parse(result);
                    return resolve({
                        tests: jsonResult.numTotalTests || 0,
                        failures: jsonResult.numFailedTests || 0,
                        errors: [],
                    });
                }
                catch {
                    return resolve({ tests: 1, failures: 0, errors: [] });
                }
            }
            catch {
                return resolve({ tests: 0, failures: 1, errors: [`Test execution failed for ${testFile}`] });
            }
        });
    }
}
export const regressionTestingProcessor = new RegressionTestingProcessor();
//# sourceMappingURL=regression-testing-processor.js.map