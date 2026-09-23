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
import { effectiveSignalConfidence, meetsConfidenceGate } from './registry/confidence-decay.js';
import { DEFAULT_SIGNALS_PATH, collectKernelDiaryText, defaultWritablePaths, discoverFieldLogDirs, discoverSiblingRepos, discoverXrayKernelDirs, hydrateWritableSignals, isGenericFieldObservedDefinition, reloadOpProc, shouldAutoSyncField, shouldAutoSyncXray, } from './paths.js';
export class RepertoireService {
    signalsManager;
    stateManager;
    orchestratorBridge;
    metaInference;
    feedbackIngester;
    logDir;
    projectRoot;
    constructor(options = {}) {
        const cwd = options.projectRoot ?? process.cwd();
        this.projectRoot = cwd;
        const writable = defaultWritablePaths(cwd);
        const dataDir = options.dataDir ?? writable.dataDir;
        this.logDir = options.logDir ?? writable.logDir;
        const seed = options.signalsPath ??
            (options.dataDir ? join(dataDir, 'curated_signals.json') : DEFAULT_SIGNALS_PATH);
        this.signalsManager = new CuratedSignalsManager(hydrateWritableSignals(seed, cwd));
        this.stateManager = new InferenceStateManager(options.statePath ?? writable.statePath);
        this.orchestratorBridge = new RepertoireOrchestratorBridge(this.signalsManager);
        this.metaInference = new MetaInferenceEngine({
            logDir: this.logDir,
            statePath: options.statePath ?? writable.statePath,
        });
        this.feedbackIngester = new OrchestratorFeedbackIngester(options.feedbackDir ?? writable.feedbackDir);
        if (shouldAutoSyncField(options.syncField)) {
            this.syncFieldMemory();
        }
        if (shouldAutoSyncXray(options.syncXray)) {
            this.syncXrayMemory();
            this.heatKernelDiary();
        }
    }
    syncFieldMemory(sourceDirs) {
        const sources = sourceDirs ?? discoverFieldLogDirs(this.projectRoot);
        let imported = 0;
        let skipped = 0;
        const promoted = [];
        for (const sourceDir of sources) {
            const result = this.ingestGrooverLogs(sourceDir);
            imported += result.imported;
            skipped += result.skipped;
            for (const name of result.promoted) {
                if (!promoted.includes(name))
                    promoted.push(name);
            }
        }
        return { imported, skipped, promoted, sources };
    }
    ingestGrooverLogs(sourceDir, options = {}) {
        const ingester = new GrooverLogIngester({
            sourceDir,
            targetDir: this.logDir,
            signalsManager: this.signalsManager,
            stateManager: this.stateManager,
            dryRun: options.dryRun,
        });
        return ingester.ingest();
    }
    ingestXraySessions(sourceDir, options = {}) {
        const ingester = new XraySessionIngester({
            sourceDir,
            targetDir: this.logDir,
            signalsManager: this.signalsManager,
            stateManager: this.stateManager,
            repoPrimitive: options.repoPrimitive,
        });
        return ingester.ingest();
    }
    syncXrayMemory(sourceDirs) {
        const sources = sourceDirs ?? discoverXrayKernelDirs(this.projectRoot);
        let imported = 0;
        let skipped = 0;
        const promoted = [];
        for (const sourceDir of sources) {
            const result = this.ingestXraySessions(sourceDir);
            imported += result.imported;
            skipped += result.skipped;
            for (const name of result.promoted) {
                if (!promoted.includes(name))
                    promoted.push(name);
            }
        }
        return { imported, skipped, promoted, sources };
    }
    syncWorkspaceRepos() {
        const siblings = discoverSiblingRepos(this.projectRoot);
        const observed = [];
        const fleshed = [];
        const sources = [];
        const matches = siblings.map((sibling) => {
            sources.push(sibling.root);
            return { name: sibling.primitive, confidence: 0.55 };
        });
        if (matches.length > 0) {
            const grown = this.signalsManager.recordPrimitiveObservations(matches);
            for (const name of grown) {
                if (!observed.includes(name))
                    observed.push(name);
            }
        }
        for (const sibling of siblings) {
            const existing = this.signalsManager.getByName(sibling.primitive);
            if (!existing ||
                !isGenericFieldObservedDefinition(existing.definition) ||
                !sibling.description.trim()) {
                continue;
            }
            if (this.signalsManager.fleshGenericRepoSignal(sibling.primitive, sibling.description, sibling.description)) {
                fleshed.push(sibling.primitive);
            }
        }
        return { observed, fleshed, sources };
    }
    /**
     * Heat existing dest names from kernel diary text. No new names.
     * Touches last_seen only when the diary contains that signal's id,
     * or the id with hyphens read as spaces. Does not append a confidence sample.
     * Two definition words are not a hit. Heat must not mint and must not
     * change observation_count or avg_confidence.
     * Colon pattern ids like `architect:architect_skill` never become dest keys.
     */
    heatKernelDiary(collected) {
        const diary = collected ?? collectKernelDiaryText(this.projectRoot);
        if (!diary.text.trim()) {
            return { heated: [], sources: diary.sources };
        }
        const hits = this.signalsManager.matchByText(diary.text, 2);
        const heated = hits.length > 0
            ? this.signalsManager.touchLastSeen(hits.map((hit) => hit.signal.name))
            : [];
        return { heated, sources: diary.sources };
    }
    reloadOpProc() {
        return reloadOpProc(this.projectRoot);
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
            effectiveConfidence: effectiveSignalConfidence(signal)?.effectiveConfidence ??
                signal.observation_stats.avg_confidence,
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
            const decayed = effectiveSignalConfidence(match.signal);
            const confidence = decayed?.effectiveConfidence ?? stats?.avg_confidence;
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
            .filter((entry) => meetsConfidenceGate(entry.confidence, minConfidence))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, limit);
    }
}
//# sourceMappingURL=RepertoireService.js.map