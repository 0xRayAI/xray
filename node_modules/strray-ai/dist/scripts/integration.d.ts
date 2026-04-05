#!/usr/bin/env node
/**
 * StringRay Integration Script
 *
 * Main CLI bridge for external systems (like Jelly commercial modules) to call into StringRay.
 * Allows spawning OpenCode CLI with StringRay agents to execute real tasks.
 *
 * @version 1.1.0
 * @since 2026-02-14
 *
 * Usage:
 *   node dist/scripts/integration.js enforcer '{"taskDescription": "Check code quality"}'
 *   node dist/scripts/integration.js --version
 *   node dist/scripts/integration.js --help
 */
export interface TaskContext {
    taskDescription: string;
    context?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface AgentConfig {
    name: string;
    system?: string;
    tools?: {
        include?: string[];
        exclude?: string[];
    };
    [key: string]: unknown;
}
export interface IntegrationResult {
    success: boolean;
    agent: string;
    task?: string;
    result?: unknown;
    error?: string;
    timestamp: string;
}
//# sourceMappingURL=integration.d.ts.map