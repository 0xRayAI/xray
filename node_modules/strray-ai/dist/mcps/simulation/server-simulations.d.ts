/**
 * Server Simulations
 *
 * Pre-built simulation implementations for all MCP servers.
 * Extracted from mcp-client.ts as part of Phase 5 refactoring.
 */
import { SimulatorFunction } from './simulation-engine.js';
export interface ServerSimulations {
    [serverName: string]: Record<string, SimulatorFunction>;
}
/**
 * Code Review server simulations
 */
export declare const codeReviewSimulations: Record<string, SimulatorFunction>;
/**
 * Security Audit server simulations
 */
export declare const securityAuditSimulations: Record<string, SimulatorFunction>;
/**
 * Performance Optimization server simulations
 */
export declare const performanceOptimizationSimulations: Record<string, SimulatorFunction>;
/**
 * Testing Strategy server simulations
 */
export declare const testingStrategySimulations: Record<string, SimulatorFunction>;
/**
 * Researcher server simulations
 */
export declare const researcherSimulations: Record<string, SimulatorFunction>;
/**
 * Framework Help server simulations
 */
export declare const frameworkHelpSimulations: Record<string, SimulatorFunction>;
/**
 * Skill Invocation server simulations
 */
export declare const skillInvocationSimulations: Record<string, SimulatorFunction>;
export declare function getAllServerSimulations(): ServerSimulations;
//# sourceMappingURL=server-simulations.d.ts.map