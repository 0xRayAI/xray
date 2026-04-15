/**
 * Processor Test Executor
 *
 * Extracted from ProcessorManager to handle test execution concerns:
 * - TypeScript/JavaScript test execution via Vitest
 * - Cross-language test execution via native test frameworks
 * - Test output parsing and result aggregation
 *
 * @version 1.0.0
 * @since 2026-04-14
 */
import type { ProjectLanguage } from "../utils/language-detector.js";
import type { TestExecutionResult } from "./processor-types.js";
export interface TestExecutionContext {
    directory?: string;
    filePath?: string;
    tool?: string;
    operation?: string;
    args?: {
        filePath?: string;
        content?: string;
        operation?: string;
    };
}
export declare function executeTestExecution(context: TestExecutionContext): Promise<TestExecutionResult>;
export declare function executeTypeScriptTests(context: TestExecutionContext, cwd: string): Promise<TestExecutionResult>;
export declare function executeGenericTests(context: TestExecutionContext, cwd: string, projectLanguage: ProjectLanguage): Promise<TestExecutionResult>;
export declare function runTestCommand(command: string, cwd: string): Promise<TestExecutionResult>;
export declare function parseTestOutput(output: string, type: "passed" | "failed"): number;
//# sourceMappingURL=processor-test-executor.d.ts.map