/**
 * Simulation Engine
 *
 * Provides fallback simulation for MCP tools when real servers are unavailable.
 * Part of Phase 5 refactoring - Simulation Layer extraction.
 */
import { MCPToolResult, ISimulationEngine } from '../types/index.js';
export type SimulatorFunction = (args: unknown) => MCPToolResult | Promise<MCPToolResult>;
export declare class SimulationEngine implements ISimulationEngine {
    private simulators;
    /**
     * Register a simulator for a specific server and tool
     */
    registerSimulator(serverName: string, toolName: string, simulator: SimulatorFunction): void;
    /**
     * Register multiple simulators for a server
     */
    registerServerSimulators(serverName: string, simulators: Record<string, SimulatorFunction>): void;
    /**
     * Check if a simulator exists for a server/tool combination
     */
    canSimulate(serverName: string, toolName: string): boolean;
    /**
     * Execute a simulation
     */
    simulate(serverName: string, toolName: string, args: unknown): Promise<MCPToolResult>;
    /**
     * Get all registered simulator names for a server
     */
    getServerTools(serverName: string): string[];
    /**
     * Get all registered server names
     */
    getRegisteredServers(): string[];
    /**
     * Unregister a specific simulator
     */
    unregisterSimulator(serverName: string, toolName: string): boolean;
    /**
     * Unregister all simulators for a server
     */
    unregisterServer(serverName: string): boolean;
    /**
     * Clear all registered simulators
     */
    clear(): void;
    /**
     * Get total count of registered simulators
     */
    getSimulatorCount(): number;
}
//# sourceMappingURL=simulation-engine.d.ts.map