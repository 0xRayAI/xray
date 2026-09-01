import { CapabilityEnhancer } from './capability-enhancer.js';
import { getConfidenceForTask, TRAP_CAPABLE_AGENTS } from './confidence-gate.js';
import { SignalInjector } from './signal-injector.js';
export class RepertoireOrchestratorBridge {
    signalsManager;
    enhancer;
    injector;
    constructor(signalsManager) {
        this.signalsManager = signalsManager;
        this.enhancer = new CapabilityEnhancer(signalsManager);
        this.injector = new SignalInjector(signalsManager);
    }
    enhanceAgentCapabilities(baseCapabilities) {
        return this.enhancer.enhance(baseCapabilities);
    }
    buildRoutingContext(operation) {
        return this.injector.buildRoutingContext(operation);
    }
    getConfidenceForTask(task) {
        return getConfidenceForTask(task, this.signalsManager);
    }
    injectSignalsIntoTasks(tasks) {
        return this.injector.matchSignalsForTasks(tasks);
    }
    buildInheritedContext(tasks) {
        return this.injector.buildInheritedContext(tasks);
    }
    buildSynthesisContext(projectRoot, dueReason = null) {
        return this.injector.buildSynthesisContext(projectRoot, dueReason);
    }
    enrichExecutionPlan(plan, tasks) {
        const enrichedTasks = this.injectSignalsIntoTasks(tasks);
        return {
            ...plan,
            tasks: enrichedTasks,
            repertoireContext: this.buildInheritedContext(enrichedTasks),
        };
    }
    selectAgentForTask(capabilities, requiredCapabilities, complexity, operationDescription, task) {
        const syntheticTask = task ?? {
            id: 'routing-op',
            description: operationDescription,
            type: requiredCapabilities[0] ?? 'general',
        };
        const confidenceContext = getConfidenceForTask(syntheticTask, this.signalsManager);
        const trapAgent = this.resolveTrapCapableAgent(confidenceContext, capabilities);
        if (trapAgent) {
            return trapAgent;
        }
        const repertoireContext = this.buildRoutingContext(operationDescription);
        let bestAgent = null;
        let bestScore = -1;
        for (const [agent, caps] of capabilities) {
            if (complexity > caps.complexityThreshold)
                continue;
            const score = this.injector.scoreAgent(agent, caps, requiredCapabilities, repertoireContext, confidenceContext);
            if (score > bestScore) {
                bestScore = score;
                bestAgent = agent;
            }
        }
        return bestAgent;
    }
    /**
     * High-confidence trap tasks route to recommendedAgent (default architect)
     * without applying complexityThreshold — boost is for scoring, not exclusion.
     */
    resolveTrapCapableAgent(confidenceContext, capabilities) {
        if (!confidenceContext.highConfidenceTrapPresent)
            return null;
        const candidates = [];
        const recommended = confidenceContext.recommendedAgent;
        if (recommended &&
            TRAP_CAPABLE_AGENTS.includes(recommended)) {
            candidates.push(recommended);
        }
        for (const agent of TRAP_CAPABLE_AGENTS) {
            if (!candidates.includes(agent))
                candidates.push(agent);
        }
        for (const agent of candidates) {
            if (capabilities.has(agent))
                return agent;
        }
        return null;
    }
    resolveThinDispatchAgent(baseAgent, operation, complexityScore) {
        const syntheticTask = {
            id: 'thin-dispatch',
            description: operation,
            type: 'routing',
        };
        const confidenceContext = getConfidenceForTask(syntheticTask, this.signalsManager);
        const repertoireContext = this.buildRoutingContext(operation);
        const adjustedScore = this.injector.adjustComplexityScore(complexityScore, repertoireContext, confidenceContext);
        let agent = baseAgent;
        if (confidenceContext.highConfidenceTrapPresent && adjustedScore >= 26) {
            agent = 'architect';
        }
        else if (repertoireContext.matchedTags.includes('provenance-failure') &&
            adjustedScore < 51) {
            agent = 'bug-triage-specialist';
        }
        return { agent, adjustedScore, repertoireContext };
    }
}
//# sourceMappingURL=RepertoireOrchestratorBridge.js.map