/**
 * Boot Orchestrator
 *
 * Implements orchestrator-first boot sequence with automatic enforcement activation.
 * Coordinates the initialization of all framework components in the correct order.
 *
 * EXECUTION PATHS:
 * - PRIMARY: .opencode/plugin/strray-codex-injection.js - Intercepts prompts in OpenCode
 * - FALLBACK: This boot-orchestrator runs when plugin is not loaded
 *
 * The framework is designed to work through OpenCode's plugin system where:
 *   1. StringRay plugin intercepts prompts via hooks
 *   2. Routes to agents via .opencode/agents/*.yml configs
 *   3. OpenCode spawns actual agent processes
 *   4. Hermes Agent handles MCP server execution
 *
 * This orchestrator provides fallback initialization when the plugin isn't available.
 *
 * @version 1.1.2
 * @since 2026-01-07
 */
import { StringRayStateManager } from "../state/state-manager.js";
import { type MemoryStats } from "../monitoring/memory-monitor.js";
export interface BootSequenceConfig {
    enableEnforcement: boolean;
    codexValidation: boolean;
    sessionManagement: boolean;
    processorActivation: boolean;
    agentLoading: boolean;
}
export interface BootResult {
    success: boolean;
    orchestratorLoaded: boolean;
    sessionManagementActive: boolean;
    processorsActivated: boolean;
    enforcementEnabled: boolean;
    codexComplianceActive: boolean;
    agentsLoaded: string[];
    errors: string[];
}
export declare class BootOrchestrator {
    private contextLoader;
    private stateManager;
    private processorManager;
    private config;
    private pluginRegistry?;
    private pluginServerRegistry?;
    private shutdownInitialized;
    constructor(config?: Partial<BootSequenceConfig>, stateManager?: StringRayStateManager);
    /**
     * Initialize delegation system components
     */
    private initializeDelegationSystem;
    private loadProcessorsConfig;
    /**
     * Initialize plugin system and register MCP servers
     */
    private initializePluginSystem;
    /**
     * Load orchestrator as the first component
     */
    private loadOrchestrator;
    /**
     * Initialize session management system
     */
    private initializeSessionManagement;
    /**
     * Activate pre/post processors
     */
    private activateProcessors;
    /**
     * Load remaining agents after orchestrator
     */
    private loadRemainingAgents;
    /**
     * Enable automatic enforcement activation
     */
    private enableEnforcement;
    /**
     * Activate codex compliance checking during boot
     */
    private activateCodexCompliance;
    private initializeSecurityComponents;
    private finalizeSecurityIntegration;
    private runInitialSecurityAudit;
    /**
     * Validate processor health during boot
     */
    private validateProcessorHealth;
    /**
     * Get current boot status information
     */
    getBootStatus(): BootResult;
    /**
     * Set up comprehensive memory monitoring and alerting
     */
    private setupMemoryMonitoring;
    /**
     * Perform comprehensive memory health check
     */
    getMemoryHealth(): {
        healthy: boolean;
        issues: string[];
        metrics: {
            current: MemoryStats;
            peak: MemoryStats;
            average: number;
            trend: string;
        };
    };
    /**
     * Execute the boot sequence (internal framework initialization)
     */
    executeBootSequence(): Promise<BootResult>;
    /**
     * Load 0xRay configuration from Python ConfigManager
     */
    private loadStringRayConfiguration;
}
export declare const bootOrchestrator: BootOrchestrator;
//# sourceMappingURL=boot-orchestrator.d.ts.map