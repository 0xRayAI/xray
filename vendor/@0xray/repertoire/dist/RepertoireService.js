import { join } from 'node:path';
import { CuratedSignalsManager, } from './registry/CuratedSignalsManager.js';
import { InferenceStateManager } from './registry/InferenceStateManager.js';
import { MetaInferenceEngine } from './synthesis/meta-inference-engine.js';
import { GrooverLogIngester } from './ingestion/groover-log-ingester.js';
import { XraySessionIngester } from './ingestion/xray-session-ingester.js';
import { OrchestratorFeedbackIngester } from './ingestion/orchestrator-feedback-ingester.js';
import { RepertoireOrchestratorBridge } from './orchestrator-bridge/RepertoireOrchestratorBridge.js';
import { OntologicalTrapEnforcer, } from './governance/ontological-trap-enforcer.js';
import { DEFAULT_MIN_CONFIDENCE_GATE } from './orchestrator-bridge/confidence-gate.js';
import { DEFAULT_DATA_DIR, DEFAULT_FEEDBACK_DIR, DEFAULT_LOG_DIR, DEFAULT_SIGNALS_PATH, DEFAULT_STATE_PATH, defaultProjectStateDir, hydrateWritableSignals, isRepertoirePackageCwd, } from './paths.js';
export class RepertoireService {
    signalsManager;
    stateManager;
    orchestratorBridge;
    metaInference;
    feedbackIngester;
    logDir;
    constructor(options = {}) {
        const cwd = options.projectRoot ?? process.cwd();
        const inOrganRepo = isRepertoirePackageCwd(cwd);
        const projectState = defaultProjectStateDir(cwd);
        const dataDir = options.dataDir ?? (inOrganRepo ? DEFAULT_DATA_DIR : projectState);
        this.logDir = options.logDir ?? (inOrganRepo ? DEFAULT_LOG_DIR : join(projectState, 'logs'));
        const seed = options.signalsPath ??
            (options.dataDir ? join(dataDir, 'curated_signals.json') : DEFAULT_SIGNALS_PATH);
        this.signalsManager = new CuratedSignalsManager(hydrateWritableSignals(seed, cwd));
        this.stateManager = new InferenceStateManager(options.statePath ??
            (inOrganRepo
                ? options.dataDir
                    ? join(dataDir, 'inference-state.json')
                    : DEFAULT_STATE_PATH
                : join(projectState, 'inference-state.json')));
        this.orchestratorBridge = new RepertoireOrchestratorBridge(this.signalsManager);
        this.metaInference = new MetaInferenceEngine({
            logDir: this.logDir,
            statePath: options.statePath ??
                (inOrganRepo ? DEFAULT_STATE_PATH : join(projectState, 'inference-state.json')),
        });
        this.feedbackIngester = new OrchestratorFeedbackIngester(options.feedbackDir ?? (inOrganRepo ? DEFAULT_FEEDBACK_DIR : join(projectState, 'feedback')));
    }
    ingestGrooverLogs(sourceDir, options = {}) {
        const ingester = new GrooverLogIngester({
            sourceDir,
            targetDir: this.logDir,
            signalsManager: this.signalsManager,
            dryRun: options.dryRun,
        });
        return ingester.ingest();
    }
    ingestXraySessions(sourceDir) {
        const ingester = new XraySessionIngester({
            sourceDir,
            targetDir: this.logDir,
            signalsManager: this.signalsManager,
        });
        return ingester.ingest();
    }
    ingestOrchestratorFeedback(entry) {
        const logPath = this.feedbackIngester.ingest(entry);
        const updatedSignals = this.signalsManager.recordFeedbackOutcome(entry);
        return { logPath, updatedSignals };
    }
    async runMetaInference() {
        return this.metaInference.run();
    }
    enhanceCapabilities(base) {
        return this.orchestratorBridge.enhanceAgentCapabilities(base);
    }
    buildRoutingContext(operation) {
        return this.orchestratorBridge.buildRoutingContext(operation);
    }
    enrichTasks(tasks) {
        return this.orchestratorBridge.injectSignalsIntoTasks(tasks);
    }
    enrichPlan(plan, tasks) {
        return this.orchestratorBridge.enrichExecutionPlan(plan, tasks);
    }
    buildInheritedContext(tasks) {
        return this.orchestratorBridge.buildInheritedContext(tasks);
    }
    buildSynthesisContext(projectRoot, dueReason = null) {
        return this.orchestratorBridge.buildSynthesisContext(projectRoot, dueReason);
    }
    selectAgent(capabilities, requiredCapabilities, complexity, operation) {
        return this.orchestratorBridge.selectAgentForTask(capabilities, requiredCapabilities, complexity, operation);
    }
    resolveThinDispatch(baseAgent, operation, complexityScore) {
        return this.orchestratorBridge.resolveThinDispatchAgent(baseAgent, operation, complexityScore);
    }
    createTrapEnforcer(governFn) {
        return new OntologicalTrapEnforcer({
            signalsManager: this.signalsManager,
            governFn,
        });
    }
    getHighConfidenceSignals(options = {}) {
        const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE_GATE;
        const limit = options.limit ?? 20;
        const tagFilter = options.tags?.map((tag) => tag.toLowerCase());
        return this.signalsManager
            .getSignalsAboveConfidence(minConfidence)
            .filter((signal) => {
            if (!signal.observation_stats)
                return false;
            if (!tagFilter?.length)
                return true;
            return signal.tags.some((tag) => tagFilter.includes(tag.toLowerCase()));
        })
            .map((signal) => ({
            ...signal,
            effectiveConfidence: signal.observation_stats.avg_confidence,
        }))
            .sort((a, b) => b.effectiveConfidence - a.effectiveConfidence ||
            (b.observation_stats?.observation_count ?? 0) -
                (a.observation_stats?.observation_count ?? 0))
            .slice(0, limit);
    }
    getTaskConfidence(input) {
        const task = {
            id: input.id ?? 'mcp-query',
            description: input.description,
            type: input.type ?? 'general',
        };
        return this.orchestratorBridge.getConfidenceForTask(task);
    }
    searchPrimitives(query, options = {}) {
        const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE_GATE;
        const limit = options.limit ?? 10;
        const matches = this.signalsManager.matchByText(query, 2);
        return matches
            .map((match) => {
            const stats = match.signal.observation_stats;
            const confidence = stats?.avg_confidence;
            if (stats === undefined || confidence === undefined)
                return null;
            return {
                name: match.signal.name,
                confidence,
                priority: match.signal.priority,
                definition: match.signal.definition,
                tags: match.signal.tags,
                status: match.signal.status,
                observationCount: stats.observation_count,
            };
        })
            .filter((entry) => entry !== null)
            .filter((entry) => entry.confidence >= minConfidence)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, limit);
    }
}
//# sourceMappingURL=RepertoireService.js.map