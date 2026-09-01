import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { applyConfidenceComplexityBoost, confidenceWeightedAgentBoost, DEFAULT_MIN_CONFIDENCE_GATE, getConfidenceForTask, resolveSignalConfidence, } from './confidence-gate.js';
export class SignalInjector {
    signalsManager;
    projectRoot;
    synthesisReportPath;
    constructor(signalsManager, projectRoot = process.cwd(), synthesisReportPath) {
        this.signalsManager = signalsManager;
        this.projectRoot = projectRoot;
        this.synthesisReportPath = synthesisReportPath;
    }
    buildRoutingContext(text) {
        const matches = this.signalsManager.matchByText(text, 2);
        const ontologicalTrapDetected = /TYPE:\s*ontological-trap/i.test(text) ||
            /ontological-trap/i.test(text) ||
            matches.some((match) => match.signal.tags.includes('ontological-trap'));
        const signalConfidences = Object.fromEntries(matches
            .map((match) => {
            const confidence = resolveSignalConfidence(match.signal.name, this.signalsManager);
            return confidence === null ? null : [match.signal.name, confidence];
        })
            .filter((entry) => entry !== null));
        const confidenceValues = Object.values(signalConfidences);
        const avgMatchConfidence = confidenceValues.length > 0
            ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
            : 0;
        const trapSignals = matches.filter((match) => match.signal.tags.includes('ontological-trap'));
        const highConfidenceTrapPresent = ontologicalTrapDetected &&
            trapSignals.some((match) => (signalConfidences[match.signal.name] ?? 0) >= DEFAULT_MIN_CONFIDENCE_GATE);
        return {
            matchedSignals: matches.map((match) => match.signal.name),
            matchedTags: [...new Set(matches.flatMap((match) => match.signal.tags))],
            ontologicalTrapDetected,
            synthesisAvailable: this.resolveSynthesisReportPath() != null,
            signalMatches: matches,
            signalConfidences,
            avgMatchConfidence,
            highConfidenceTrapPresent,
        };
    }
    matchSignalsForTasks(tasks) {
        return tasks.map((task) => {
            const confidenceContext = getConfidenceForTask(task, this.signalsManager);
            const ctx = this.buildRoutingContext(`${task.description} ${task.type}`);
            const signalConfidences = Object.fromEntries(confidenceContext.signals.map((entry) => [entry.name, entry.confidence]));
            return {
                ...task,
                metadata: {
                    ...task.metadata,
                    repertoireSignals: confidenceContext.signals.map((entry) => entry.name),
                    matchedPrimitives: confidenceContext.signals.map((entry) => entry.name),
                    ontologicalTrapDetected: confidenceContext.ontologicalTrapDetected,
                    memorySignalConfidences: signalConfidences,
                    memoryAvgConfidence: confidenceContext.avgConfidence,
                    memoryHighConfidenceTrap: confidenceContext.highConfidenceTrapPresent,
                    memoryComplexityBoost: confidenceContext.complexityBoost,
                    match_confidence: signalConfidences,
                    synthesisContext: ctx.synthesisAvailable
                        ? this.getSynthesisExcerpt(500)
                        : undefined,
                },
            };
        });
    }
    buildSynthesisContext(projectRoot, dueReason = null) {
        const operation = 'synthesis checkpoint reflect realign coherence plan codex signals primitives';
        const matches = this.signalsManager.matchByText(operation, 6);
        const signalConfidences = Object.fromEntries(matches
            .map((match) => {
            const confidence = resolveSignalConfidence(match.signal.name, this.signalsManager);
            return confidence === null ? null : [match.signal.name, confidence];
        })
            .filter((entry) => entry !== null));
        const matchedSignals = matches.map((match) => ({
            name: match.signal.name,
            definition: match.signal.definition,
            priority: match.signal.priority,
            ...(signalConfidences[match.signal.name] !== undefined
                ? { confidence: signalConfidences[match.signal.name] }
                : {}),
        }));
        const codex = this.readCodexExcerpt(projectRoot);
        const planExcerpt = this.readPlanExcerpt(projectRoot);
        const synthesisExcerpt = this.getSynthesisExcerpt(2000);
        const sections = [
            '# Synthesis checkpoint',
            dueReason ? `Due: ${dueReason}` : '',
            matchedSignals.length
                ? `## Matched primitives\n${matchedSignals
                    .map((s) => `- ${s.name} (${s.priority}): ${s.definition}`)
                    .join('\n')}`
                : '',
            codex.excerpt ? `## Codex (${codex.termCount} terms)\n${codex.excerpt}` : '',
            planExcerpt ? `## Lead-dev plan\n${planExcerpt}` : '',
            synthesisExcerpt ? `## Prior synthesis\n${synthesisExcerpt}` : '',
        ].filter(Boolean);
        return {
            primitive: 'synthesis',
            matchedSignals,
            ...(synthesisExcerpt ? { synthesisExcerpt } : {}),
            codexTermCount: codex.termCount,
            codexExcerpt: codex.excerpt,
            planExcerpt,
            collatedText: sections.join('\n\n'),
        };
    }
    buildInheritedContext(tasks) {
        const allText = tasks.map((task) => `${task.description} ${task.type}`).join(' ');
        const matches = this.signalsManager.matchByText(allText, 2);
        const trapSignals = matches
            .filter((match) => match.signal.tags.includes('ontological-trap'))
            .map((match) => match.signal.name);
        return {
            matchedSignals: matches.slice(0, 8).map((match) => ({
                name: match.signal.name,
                definition: match.signal.definition,
                priority: match.signal.priority,
            })),
            synthesisExcerpt: this.getSynthesisExcerpt(2000),
            ontologicalTrapSignals: trapSignals,
        };
    }
    /**
     * Signal-aware agent scoring — drop-in replacement logic for AgentCapabilitiesManager.
     */
    scoreAgent(agent, caps, requiredCapabilities, repertoireContext, confidenceContext) {
        const capMatch = requiredCapabilities.filter((cap) => caps.capabilities.includes(cap)).length;
        const signalMatch = repertoireContext.matchedSignals.reduce((sum, signalName) => {
            if (!caps.repertoireSignals?.includes(signalName) &&
                !caps.capabilities.includes(signalName)) {
                return sum;
            }
            const confidence = repertoireContext.signalConfidences[signalName];
            if (confidence === undefined)
                return sum;
            return sum + confidence;
        }, 0);
        const tagMatch = repertoireContext.matchedTags.filter((tag) => caps.repertoireTags?.includes(tag)).length;
        const trapBoost = confidenceContext
            ? confidenceWeightedAgentBoost(agent, confidenceContext)
            : 0;
        return (capMatch * 10 +
            signalMatch * 8 +
            tagMatch * 5 +
            trapBoost +
            caps.concurrentTasks);
    }
    /**
     * Complexity adjustment for thinDispatch when Repertoire context is present.
     */
    adjustComplexityScore(baseScore, context, confidenceContext) {
        if (confidenceContext) {
            return applyConfidenceComplexityBoost(baseScore, confidenceContext);
        }
        return baseScore;
    }
    resolveSynthesisReportPath() {
        if (this.synthesisReportPath) {
            const custom = this.synthesisReportPath.startsWith('/')
                ? this.synthesisReportPath
                : join(this.projectRoot, this.synthesisReportPath);
            return existsSync(custom) ? custom : null;
        }
        const candidates = [
            join(this.projectRoot, 'logs/meta-inference/synthesis.md'),
            join(this.projectRoot, 'logs/meta-inference/dry-synthesis.md'),
        ];
        return candidates.find((candidate) => existsSync(candidate)) ?? null;
    }
    getSynthesisExcerpt(maxChars) {
        const reportPath = this.resolveSynthesisReportPath();
        if (!reportPath)
            return undefined;
        const content = readFileSync(reportPath, 'utf8');
        const section5 = content.split('## 5. Strategic Recommendations')[1];
        const excerpt = section5 ?? content.slice(-maxChars);
        return excerpt.slice(0, maxChars).trim();
    }
    readCodexExcerpt(projectRoot, maxChars = 1200) {
        const codexPath = join(projectRoot, '.xray', 'codex.json');
        if (!existsSync(codexPath))
            return { termCount: 0, excerpt: '' };
        try {
            const data = JSON.parse(readFileSync(codexPath, 'utf8'));
            const terms = data.terms ?? [];
            const lines = terms.slice(0, 12).map((t) => {
                const label = t.title ?? t.rule ?? '';
                return t.id != null ? `${t.id}. ${label}` : label;
            });
            return { termCount: terms.length, excerpt: lines.join('\n').slice(0, maxChars) };
        }
        catch {
            return { termCount: 0, excerpt: '' };
        }
    }
    readPlanExcerpt(projectRoot, maxChars = 1200) {
        const planPath = join(projectRoot, '.xray', 'state', 'lead-dev-plan.json');
        if (!existsSync(planPath))
            return '';
        try {
            const plan = JSON.parse(readFileSync(planPath, 'utf8'));
            const phases = plan.phases ?? [];
            const lines = [`active: ${plan.active !== false}`];
            for (const phase of phases) {
                lines.push(`## ${phase.id}${phase.name ? ` — ${phase.name}` : ''}`);
                for (const todo of phase.todos) {
                    lines.push(`- [${todo.status}] ${todo.id} (${todo.subagent ?? 'agent'}): ${todo.task}`);
                }
            }
            return lines.join('\n').slice(0, maxChars);
        }
        catch {
            return '';
        }
    }
}
//# sourceMappingURL=signal-injector.js.map