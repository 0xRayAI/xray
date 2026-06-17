/**
 * Processor Types
 *
 * Type definitions for the processor activation system.
 * Replaces `any` types with proper interfaces for type safety.
 * This file is the central source of truth for shared processor types
 * to avoid circular dependencies.
 *
 * @since 2026-01-07
 */

/**
 * Tool argument structure passed to processors
 */
export interface ToolInputArgs {
  filePath?: string;
  content?: string;
  operation?: string;
  directory?: string;
  args?: Record<string, string>;
}

/**
 * Tool input containing execution details
 */
export interface ToolInput {
  tool?: string;
  args?: ToolInputArgs;
}

/**
 * Processor execution context - used by processors to understand their environment
 */
export interface ProcessorContext {
  /** Tool input (for pre-processors) */
  toolInput?: ToolInput;
  /** File path being processed */
  filePath?: string;
  /** Operation being performed */
  operation?: string;
  /** Content being processed */
  content?: string;
  /** Working directory */
  directory?: string;
  /** Tool being executed */
  tool?: string;
  /** Additional context - string, numeric, boolean, or object values */
  [key: string]: ToolInput | ToolInputArgs | string | number | boolean | object | undefined;
}

/**
 * Standard result returned by all processors
 * Uses unknown for data to handle any processor-specific return type
 */
export interface ProcessorResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
  processorName: string;
}

export interface PreValidateContext {
  operation: string;
  data?: string;
  syntaxCheck?: boolean;
  codexCompliance?: boolean;
  agentName?: string;
  filesChanged?: string[];
  riskLevel?: "low" | "medium" | "high" | "critical";
  tool?: string;
  directory?: string;
  args?: ToolInputArgs;
  config?: Record<string, unknown>;
}

export interface PostValidateContext {
  operation: string;
  data?: string;
  preResults: ProcessorExecutionResult[];
  testResults?: TestResults;
  regressionResults?: RegressionResults;
  stateValidation?: boolean;
  tool?: string;
  directory?: string;
  args?: ToolInputArgs;
}

export interface ProcessorHook {
  name: string;
  execute: (context: PreValidateContext | PostValidateContext) => Promise<ProcessorExecutionResult>;
  priority: number;
  enabled: boolean;
  before?: (context: PreValidateContext | PostValidateContext) => Promise<void>;
  after?: (result: ProcessorExecutionResult) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

export interface ProcessorRegistration {
  name: string;
  type: "pre" | "post";
  hook: ProcessorHook;
}

export interface ProcessorExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  processorName: string;
  data?: unknown;
}

export interface ProcessorHealthCheck {
  name: string;
  status: "healthy" | "degraded" | "failed";
  lastRun: number;
  successRate: number;
  averageExecutionTime: number;
  totalRuns: number;
  failedRuns: number;
}

// Additional types for better type safety
export interface TestResults {
  passed: number;
  failed: number;
  total: number;
  duration: number;
}

export interface RegressionResults {
  issues: string[];
  passed: boolean;
}

// Processor execution result types

export interface VersionComplianceProcessorResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  checkedAt: string;
}

export interface CodexComplianceProcessorResult {
  compliant: boolean;
  violations: string[];
  warnings: string[];
  termsChecked: number;
  operation: string;
  timestamp: string;
  error?: boolean;
}

export interface ErrorBoundaryResult {
  boundaries: string;
}

export interface LogProtectionProcessorResult {
  allowed: boolean;
  reason?: string;
}

export interface AgentsMdValidationProcessorResult {
  success: boolean;
  blocked: boolean;
  message?: string;
  errors: string[];
  warnings: string[];
  checkedAt: string;
}

export interface TestExecutionResult {
  testsExecuted: number;
  passed: number;
  failed: number;
  exitCode?: number;
  output?: string;
  success: boolean;
  error?: string;
}

export interface RegressionTestingResult {
  regressions: string;
  issues: string[];
}

export interface StateValidationResult {
  stateValid: boolean;
}

export interface RefactoringLoggingResult {
  logged: boolean;
  success: boolean;
  message: string;
  error?: string;
}

export interface TestAutoCreationResult {
  success: boolean;
  message?: string;
  data?: string[];
  error?: string;
}

export interface CoverageAnalysisResult {
  success: boolean;
  message: string;
  coverage: number;
}

export interface RuleViolationEntry {
  rule: string;
  message: string;
}
