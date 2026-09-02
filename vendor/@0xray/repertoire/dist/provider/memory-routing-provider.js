/**
 * Repertoire implementation of the 0xRay MemoryRoutingProvider contract.
 *
 * Loaded dynamically by 0xRay via features.json memory_routing.module_path.
 * Other providers can follow the same createMemoryRoutingProvider() export pattern.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_DATA_DIR, DEFAULT_FEEDBACK_DIR, DEFAULT_LOG_DIR, DEFAULT_SIGNALS_PATH, DEFAULT_STATE_PATH, defaultProjectStateDir, hydrateWritableSignals, isRepertoirePackageCwd, resolveReadableConfigPath, resolveWritableConfigPath, } from '../paths.js';
import { RepertoireService } from '../RepertoireService.js';
function toRepertoireCaps(caps) {
    return {
        capabilities: caps.capabilities,
        complexityThreshold: caps.complexityThreshold,
        concurrentTasks: caps.concurrentTasks,
        repertoireSignals: caps.memorySignals,
        repertoireTags: caps.memoryTags,
    };
}
function fromRepertoireCaps(caps) {
    return {
        capabilities: caps.capabilities,
        complexityThreshold: caps.complexityThreshold,
        concurrentTasks: caps.concurrentTasks,
        memorySignals: caps.repertoireSignals,
        memoryTags: caps.repertoireTags,
    };
}
function toRoutingContext(ctx) {
    return {
        providerId: 'repertoire',
        matchedSignals: ctx.matchedSignals,
        matchedTags: ctx.matchedTags,
        flags: {
            ontologicalTrapDetected: ctx.ontologicalTrapDetected,
            highConfidenceTrap: ctx.highConfidenceTrapPresent,
        },
        synthesisAvailable: ctx.synthesisAvailable,
        signalConfidences: ctx.signalConfidences,
        avgMatchConfidence: ctx.avgMatchConfidence,
    };
}
export { resolveReadableConfigPath as resolveProviderConfigPath } from '../paths.js';
function toInheritedContext(ctx) {
    return {
        providerId: 'repertoire',
        matchedSignals: ctx.matchedSignals.map((s) => ({
            name: s.name,
            definition: s.definition,
            priority: s.priority,
        })),
        synthesisExcerpt: ctx.synthesisExcerpt,
        flags: { ontologicalTrapDetected: ctx.ontologicalTrapSignals.length > 0 },
    };
}
export class RepertoireMemoryRoutingProvider {
    id = 'repertoire';
    name = 'Repertoire (deep memory + primitive registry)';
    service;
    signalsPath;
    constructor(config = {}) {
        const cwd = typeof config.projectRoot === 'string' ? config.projectRoot : process.cwd();
        const inOrganRepo = isRepertoirePackageCwd(cwd);
        const projectState = defaultProjectStateDir(cwd);
        const seed = resolveReadableConfigPath(config.signalsPath, cwd, DEFAULT_SIGNALS_PATH);
        this.signalsPath = hydrateWritableSignals(seed, cwd);
        this.service = new RepertoireService({
            projectRoot: cwd,
            dataDir: resolveWritableConfigPath(config.dataDir, cwd, inOrganRepo ? DEFAULT_DATA_DIR : projectState),
            signalsPath: this.signalsPath,
            statePath: resolveWritableConfigPath(config.statePath, cwd, inOrganRepo ? DEFAULT_STATE_PATH : join(projectState, 'inference-state.json')),
            logDir: resolveWritableConfigPath(config.logDir, cwd, inOrganRepo ? DEFAULT_LOG_DIR : join(projectState, 'logs')),
            feedbackDir: resolveWritableConfigPath(config.feedbackDir, cwd, inOrganRepo ? DEFAULT_FEEDBACK_DIR : join(projectState, 'feedback')),
        });
    }
    getAvailabilityStatus() {
        try {
            const signals = this.service.signalsManager.load();
            const count = signals.signals.length;
            if (count === 0) {
                return {
                    available: false,
                    reason: 'empty_registry',
                    signalCount: 0,
                    signalsPath: this.signalsPath,
                };
            }
            return {
                available: true,
                reason: 'ok',
                signalCount: count,
                signalsPath: this.signalsPath,
            };
        }
        catch {
            return {
                available: false,
                reason: existsSync(this.signalsPath) ? 'signals_unreadable' : 'signals_missing',
                signalCount: 0,
                signalsPath: this.signalsPath,
            };
        }
    }
    isAvailable() {
        return this.getAvailabilityStatus().available;
    }
    buildRoutingContext(operation) {
        return toRoutingContext(this.service.buildRoutingContext(operation));
    }
    enhanceAgentCapabilities(base) {
        const repCaps = new Map(Array.from(base.entries()).map(([k, v]) => [k, toRepertoireCaps(v)]));
        const enriched = this.service.enhanceCapabilities(repCaps);
        return new Map(Array.from(enriched.entries()).map(([k, v]) => [k, fromRepertoireCaps(v)]));
    }
    enrichTasks(tasks) {
        const repTasks = tasks.map((t) => ({
            id: t.id,
            description: t.description,
            type: t.type,
            priority: t.priority,
            dependencies: t.dependencies,
            estimatedComplexity: t.estimatedComplexity,
            metadata: t.metadata,
        }));
        const enriched = this.service.enrichTasks(repTasks);
        return enriched.map((t) => ({
            id: t.id,
            description: t.description,
            type: t.type,
            priority: t.priority,
            dependencies: t.dependencies,
            estimatedComplexity: t.estimatedComplexity,
            metadata: {
                ...t.metadata,
                memoryProviderId: 'repertoire',
                memorySignals: t.metadata?.repertoireSignals,
            },
        }));
    }
    buildInheritedContext(tasks) {
        const repTasks = tasks.map((t) => ({
            id: t.id,
            description: t.description,
            type: t.type,
        }));
        return toInheritedContext(this.service.buildInheritedContext(repTasks));
    }
    selectAgent(capabilities, requiredCapabilities, complexity, operation) {
        const repCaps = new Map(Array.from(capabilities.entries()).map(([k, v]) => [k, toRepertoireCaps(v)]));
        return this.service.selectAgent(repCaps, requiredCapabilities, complexity, operation);
    }
    resolveThinDispatch(baseAgent, operation, complexityScore) {
        const resolved = this.service.resolveThinDispatch(baseAgent, operation, complexityScore);
        return {
            agent: resolved.agent,
            adjustedScore: resolved.adjustedScore,
            context: toRoutingContext(resolved.repertoireContext),
        };
    }
    getTaskConfidence(task) {
        const repTask = {
            id: task.id,
            description: task.description,
            type: task.type,
            priority: task.priority,
            dependencies: task.dependencies,
            estimatedComplexity: task.estimatedComplexity,
            metadata: task.metadata,
        };
        const context = this.service.orchestratorBridge.getConfidenceForTask(repTask);
        return {
            signals: context.signals.map((entry) => ({
                name: entry.name,
                confidence: entry.confidence,
            })),
            matchedSignals: context.matchedSignals,
            avgConfidence: context.avgConfidence,
            maxConfidence: context.maxConfidence,
            highConfidenceTrapPresent: context.highConfidenceTrapPresent,
            ontologicalTrapDetected: context.ontologicalTrapDetected,
            complexityBoost: context.complexityBoost,
            recommendedAgent: context.recommendedAgent,
        };
    }
    ingestFeedback(entry) {
        return this.service.ingestOrchestratorFeedback({
            timestamp: entry.timestamp,
            sessionId: entry.sessionId,
            taskId: entry.taskId,
            assignedAgent: entry.assignedAgent,
            repertoireSignals: entry.memorySignals,
            complexity: entry.complexity,
            success: entry.success,
            durationMs: entry.durationMs,
            dynamoResult: entry.dynamoResult,
        });
    }
    buildSynthesisContext(opts) {
        return this.service.buildSynthesisContext(opts.projectRoot, opts.dueReason ?? null);
    }
    async refreshMetaInference() {
        const report = await this.service.runMetaInference();
        return { refreshed: report !== null };
    }
}
/** Factory export — 0xRay provider-loader calls this by name */
export function createMemoryRoutingProvider(config) {
    return new RepertoireMemoryRoutingProvider(config);
}
//# sourceMappingURL=memory-routing-provider.js.map