import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DEFAULT_SIGNALS_PATH, hydrateWritableSignals, isFactorySeedFile, isGenericFieldObservedDefinition, } from '../paths.js';
import { effectiveSignalConfidence, shouldDemoteValidatedSignal, } from './confidence-decay.js';
export const DEFAULT_PROMOTION_MIN_CONFIDENCE = 0.55;
export const DEFAULT_PROMOTION_MIN_OBSERVATIONS = 2;
/** One outcome moves routing. A 0.002 nudge on a floor average does not. */
export const FEEDBACK_SUCCESS_CONFIDENCE_BOOST = 0.1;
export const FEEDBACK_FAILURE_CONFIDENCE_PENALTY = 0.1;
/** Failure may drop below the promotion gate so the law leaves the next decision. */
export const FEEDBACK_MIN_CONFIDENCE = 0;
/** Consecutive definition content words that count as a paraphrase of the law. */
export const LAW_CLAUSE_SPAN = 4;
const LEARNED_CONVICTION_FILE = 'learned-conviction.json';
const CLAUSE_STOP = new Set([
    'a', 'an', 'the', 'only', 'just', 'not', 'never', 'always', 'and', 'or', 'of', 'to', 'for',
    'on', 'in', 'with', 'from', 'by', 'is', 'are', 'be', 'this', 'that', 'it', 'as', 'at', 'do',
    'does', 'into', 'than', 'then', 'so', 'if', 'but', 'its', 'their', 'was', 'were',
]);
export function isConfidenceFloor(value, gate = DEFAULT_PROMOTION_MIN_CONFIDENCE) {
    return Math.abs(value - gate) <= 1e-4;
}
export function clauseTokens(text) {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 3 && !CLAUSE_STOP.has(word));
}
function isSubsequence(window, query) {
    let index = 0;
    for (const word of window) {
        while (index < query.length && query[index] !== word)
            index += 1;
        if (index >= query.length)
            return false;
        index += 1;
    }
    return true;
}
/**
 * A paraphrase is four consecutive definition content words, in order, inside a
 * short query window (twice the clause). Two stray words are not a clause.
 * The same words scattered through a long diary are not a clause.
 */
export function lawClauseInText(definition, text, span = LAW_CLAUSE_SPAN) {
    const law = clauseTokens(definition);
    const query = clauseTokens(text);
    if (law.length < span || query.length < span)
        return false;
    const room = span * 2;
    for (let start = 0; start + span <= law.length; start += 1) {
        const window = law.slice(start, start + span);
        for (let at = 0; at < query.length; at += 1) {
            const slice = query.slice(at, at + room);
            if (slice.length < span)
                break;
            if (isSubsequence(window, slice))
                return true;
        }
    }
    return false;
}
function evidenceWeight(previous, gate) {
    if (!previous)
        return 0;
    if (typeof previous.evidence_count === 'number')
        return previous.evidence_count;
    if (previous.avg_confidence > gate + 1e-4)
        return previous.observation_count;
    return 0;
}
/** Historical averages with no counter still count as one piece of evidence. */
function seededEvidenceCount(evidence) {
    return typeof evidence === 'number' && evidence > 0 ? evidence : 1;
}
function validLessons(value) {
    if (!Array.isArray(value))
        return [];
    const lessons = [];
    for (const item of value) {
        if (!item || typeof item !== 'object')
            continue;
        const row = item;
        if (typeof row.taskId !== 'string' || row.taskId.length === 0)
            continue;
        if (row.decision !== 'success' && row.decision !== 'failure')
            continue;
        if (typeof row.text !== 'string' || typeof row.at !== 'string')
            continue;
        lessons.push({ taskId: row.taskId, decision: row.decision, text: row.text, at: row.at });
    }
    return lessons;
}
function validLessonIds(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => typeof item === 'string' && item.length > 0);
}
function convictionRecord(stats, signal, prior) {
    const lessons = signal.lessons?.length ? signal.lessons : prior?.lessons;
    const retained = signal.retained_lesson_ids?.length ? signal.retained_lesson_ids : prior?.retained_lesson_ids;
    const row = {
        avg_confidence: stats.avg_confidence,
        evidence_count: seededEvidenceCount(stats.evidence_count),
        updated_at: stats.last_seen,
    };
    if (lessons?.length)
        row.lessons = lessons;
    if (retained?.length)
        row.retained_lesson_ids = retained;
    return row;
}
export function isAboveConfidenceFloor(value, gate = DEFAULT_PROMOTION_MIN_CONFIDENCE) {
    return value > gate && !isConfidenceFloor(value, gate);
}
/** Hot lines kept on a law. Older lines leave only after their task id is in the ledger. */
export const LESSON_LINE_CAP = 20;
export const LESSON_TEXT_CAP = 400;
const FIELD_PRIMITIVE_NAME = /^[A-Za-z][A-Za-z0-9_-]{2,119}$/;
/**
 * The diary names a law only when it contains the signal id, or the id with
 * hyphens read as spaces. A repo tail, leftover tokens, and two definition
 * words are not the name.
 */
export function signalNameInText(text, name) {
    const normalized = text.toLowerCase();
    const id = name.toLowerCase();
    if (!id)
        return false;
    if (normalized.includes(id))
        return true;
    const spaced = id.replace(/-/g, ' ');
    return spaced !== id && normalized.includes(spaced);
}
const GROOVER_EXPERIMENT_NAMES = new Set([
    'criteria_selection_gap',
    'external_norm_smuggling_risk',
    'model-latent-geometry-as-true-invariant',
]);
/** Enriched JSONL names only — not June heading dumps (`phase-3-…`, `7-final-statement`). */
export function isFieldPrimitiveName(name) {
    if (!FIELD_PRIMITIVE_NAME.test(name))
        return false;
    if (/^phase-\d/i.test(name))
        return false;
    if (/^\d/.test(name))
        return false;
    if (GROOVER_EXPERIMENT_NAMES.has(name))
        return false;
    return true;
}
/** Slug a session/pattern/package label into a dest name, or null. */
export function slugFieldPrimitiveName(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    const bare = trimmed.replace(/^@[^/]+\//, '');
    const slug = bare
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return isFieldPrimitiveName(slug) ? slug : null;
}
/** Workspace map name — `repo-xray`, not a June heading. */
export function repoPrimitiveName(pkgName, dirName) {
    const pkgSlug = slugFieldPrimitiveName(pkgName);
    const dirSlug = dirName ? slugFieldPrimitiveName(dirName) : null;
    const scaffold = pkgSlug != null && (/vite-react/.test(pkgSlug) || /shadcn/.test(pkgSlug));
    const slug = pkgSlug && !scaffold ? pkgSlug : (dirSlug ?? pkgSlug);
    if (!slug)
        return null;
    const name = slug.startsWith('repo-') ? slug : `repo-${slug}`;
    return isFieldPrimitiveName(name) ? name : null;
}
export function proposeFieldObservedSignal(name, now) {
    const spoken = name.replace(/[_-]+/g, ' ').trim();
    return {
        name,
        definition: `${spoken}. Field-observed domain primitive grown from enriched JSONL. Not the factory seed.`,
        tags: ['field-observed', 'domain'],
        priority: 'medium',
        status: 'proposed',
        first_seen: now,
        evaluation_criteria: `Enriched log named ${name} at or above the 0.55 gate.`,
        validation_experiment: 'Ingest field JSONL. Promote after two observations.',
        master_index_integration: 'Project dest only. Factory tarball stays 8 names.',
        implementation_notes: 'Propose-on-observe. Do not copy the 145-name 0.1.8 dump.',
        example_inference_snippet: spoken,
    };
}
export class CuratedSignalsManager {
    filePath;
    constructor(filePath) {
        this.filePath = filePath ?? hydrateWritableSignals(DEFAULT_SIGNALS_PATH);
        this.restoreLearnedConviction();
        this.seedLearnedConviction();
    }
    learnedConvictionPath() {
        return join(dirname(this.filePath), LEARNED_CONVICTION_FILE);
    }
    load() {
        if (!existsSync(this.filePath)) {
            return this.createEmptyFile();
        }
        return JSON.parse(readFileSync(this.filePath, 'utf8'));
    }
    save(data) {
        if (isFactorySeedFile(this.filePath)) {
            throw new Error(`Refusing to write factory seed (${this.filePath}). Hydrate a project copy under .xray/state/repertoire/.`);
        }
        data.last_updated = new Date().toISOString();
        writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    }
    /**
     * Replace a generic field-observed stub with live sibling flesh.
     * Keeps observation stats. Refuses overlay/subject definitions already written.
     */
    fleshGenericRepoSignal(name, definition, snippet) {
        const data = this.load();
        const signal = data.signals.find((entry) => entry.name === name);
        if (!signal || !isGenericFieldObservedDefinition(signal.definition)) {
            return false;
        }
        signal.definition = definition;
        if (snippet)
            signal.example_inference_snippet = snippet;
        this.save(data);
        return true;
    }
    addSignal(signal) {
        const data = this.load();
        const exists = data.signals.some((s) => s.name === signal.name);
        if (!exists) {
            data.signals.push(signal);
            this.save(data);
        }
    }
    getByName(name) {
        return this.load().signals.find((s) => s.name === name);
    }
    getByTag(tag) {
        const normalized = tag.toLowerCase();
        return this.load().signals.filter((s) => s.tags.some((t) => t.toLowerCase() === normalized));
    }
    getHighPrioritySignals() {
        return this.load().signals.filter((s) => s.priority === 'high');
    }
    getByPriority(priority) {
        return this.load().signals.filter((s) => s.priority === priority);
    }
    /**
     * Score text against signals. A hit is the signal id, the id with hyphens
     * read as spaces, or a consecutive definition clause. Two definition words
     * are not a match.
     */
    matchByText(text, minScore = 2) {
        const normalized = text.toLowerCase();
        const matches = [];
        for (const signal of this.load().signals) {
            const named = signalNameInText(text, signal.name);
            const clause = !named && lawClauseInText(signal.definition, text);
            if (!named && !clause)
                continue;
            const matchedOn = named ? ['name'] : ['definition'];
            let score = named ? 5 : 4;
            for (const tag of signal.tags) {
                if (normalized.includes(tag.toLowerCase())) {
                    score += 3;
                    matchedOn.push('tag');
                    break;
                }
            }
            const definitionWords = signal.definition
                .toLowerCase()
                .split(/[^\w.]+/)
                .filter((w) => w.length > 5 || (/\d/.test(w) && w.length >= 3));
            const definitionHits = definitionWords.filter((w) => normalized.includes(w)).length;
            if (definitionHits >= 2) {
                score += Math.min(definitionHits, 4);
                matchedOn.push('definition');
            }
            if (signal.evaluation_criteria) {
                const criteriaWords = signal.evaluation_criteria.toLowerCase().split(/\W+/).filter((w) => w.length > 5);
                const criteriaHits = criteriaWords.filter((w) => normalized.includes(w)).length;
                if (criteriaHits >= 2) {
                    score += Math.min(criteriaHits, 3);
                    matchedOn.push('criteria');
                }
            }
            if (signal.example_inference_snippet) {
                const snippet = signal.example_inference_snippet.toLowerCase().slice(0, 80);
                if (normalized.includes(snippet.slice(0, 40))) {
                    score += 4;
                    matchedOn.push('snippet');
                }
            }
            if (signal.priority === 'high')
                score += 1;
            if (score >= minScore) {
                matches.push({ signal, score, matchedOn });
            }
        }
        return matches.sort((a, b) => b.score - a.score);
    }
    matchInferenceEntry(inference) {
        const typeMatch = inference.match(/TYPE:\s*(\S+)/i);
        const type = typeMatch?.[1]?.toLowerCase();
        const matches = this.matchByText(inference, 2);
        if (type === 'ontological-trap') {
            const trapSignals = this.getByTag('ontological-trap');
            for (const signal of trapSignals) {
                if (!matches.some((m) => m.signal.name === signal.name)) {
                    matches.push({ signal, score: 3, matchedOn: ['tag'] });
                }
            }
        }
        return matches.sort((a, b) => b.score - a.score);
    }
    /**
     * Mark names the diary already matched. Does not append a confidence sample.
     * Missing names are left absent. Heat must not mint a law.
     */
    touchLastSeen(names) {
        const data = this.load();
        const now = new Date().toISOString();
        const updated = [];
        const seen = new Set();
        for (const name of names) {
            if (!name || seen.has(name))
                continue;
            seen.add(name);
            const signal = data.signals.find((entry) => entry.name === name);
            if (!signal)
                continue;
            const previous = signal.observation_stats;
            signal.observation_stats = previous
                ? { ...previous, last_seen: now }
                : {
                    observation_count: 0,
                    avg_confidence: 0,
                    max_confidence: 0,
                    last_seen: now,
                    governance_forced_count: 0,
                };
            updated.push(signal.name);
        }
        if (updated.length > 0) {
            this.save(data);
        }
        return updated;
    }
    recordPrimitiveObservations(matches, options = {}) {
        const minConfidence = options.minConfidence ?? DEFAULT_PROMOTION_MIN_CONFIDENCE;
        const data = this.load();
        const updated = [];
        const now = new Date().toISOString();
        for (const match of matches) {
            if (match.confidence < minConfidence)
                continue;
            let signal = data.signals.find((entry) => entry.name === match.name);
            if (!signal) {
                if (!isFieldPrimitiveName(match.name))
                    continue;
                signal = proposeFieldObservedSignal(match.name, now);
                data.signals.push(signal);
            }
            const previous = signal.observation_stats;
            const observationCount = (previous?.observation_count ?? 0) + 1;
            const forced = (previous?.governance_forced_count ?? 0) + (options.governanceForced ? 1 : 0);
            const atFloor = isConfidenceFloor(match.confidence, minConfidence);
            if (atFloor) {
                signal.observation_stats = previous
                    ? {
                        ...previous,
                        observation_count: observationCount,
                        last_seen: now,
                        governance_forced_count: forced,
                        evidence_count: evidenceWeight(previous, minConfidence),
                    }
                    : {
                        observation_count: observationCount,
                        avg_confidence: match.confidence,
                        max_confidence: match.confidence,
                        last_seen: now,
                        governance_forced_count: forced,
                        evidence_count: 0,
                    };
                updated.push(signal.name);
                continue;
            }
            const weight = evidenceWeight(previous, minConfidence);
            const evidenceCount = weight + 1;
            const priorAvg = weight > 0 && previous ? previous.avg_confidence : 0;
            signal.observation_stats = {
                observation_count: observationCount,
                avg_confidence: (priorAvg * weight + match.confidence) / evidenceCount,
                max_confidence: Math.max(previous?.max_confidence ?? 0, match.confidence),
                last_seen: now,
                governance_forced_count: forced,
                evidence_count: evidenceCount,
            };
            updated.push(signal.name);
        }
        if (updated.length > 0) {
            this.save(data);
        }
        return updated;
    }
    shouldPromoteSignal(signal, options = {}) {
        const minAvgConfidence = options.minAvgConfidence ?? DEFAULT_PROMOTION_MIN_CONFIDENCE;
        const minObservations = options.minObservations ?? DEFAULT_PROMOTION_MIN_OBSERVATIONS;
        const fromStatus = options.fromStatus ?? 'proposed';
        const stats = signal.observation_stats;
        if ((signal.status ?? 'proposed') !== fromStatus || !stats) {
            return false;
        }
        return (stats.avg_confidence >= minAvgConfidence &&
            stats.observation_count >= minObservations);
    }
    promoteQualifiedSignals(options = {}) {
        const toStatus = options.toStatus ?? 'validated';
        const data = this.load();
        const promoted = [];
        for (const signal of data.signals) {
            if (this.shouldPromoteSignal(signal, options)) {
                signal.status = toStatus;
                promoted.push(signal.name);
            }
        }
        if (promoted.length > 0) {
            this.save(data);
        }
        return promoted;
    }
    getSignalsAboveConfidence(minAvgConfidence = DEFAULT_PROMOTION_MIN_CONFIDENCE, options = {}) {
        return this.load().signals.filter((signal) => {
            const decayed = effectiveSignalConfidence(signal, options);
            return (decayed?.effectiveConfidence ?? 0) >= minAvgConfidence;
        });
    }
    /**
     * Demote project-local validated signals whose raw (unfloored) decay
     * dropped below the gate. Factory-scale corpora (≥100 observations) stay.
     */
    demoteStaleValidatedSignals(options = {}) {
        const data = this.load();
        const demoted = [];
        for (const signal of data.signals) {
            if (shouldDemoteValidatedSignal(signal, options)) {
                signal.status = 'proposed';
                demoted.push(signal.name);
            }
        }
        if (demoted.length > 0) {
            this.save(data);
        }
        return demoted;
    }
    /**
     * Record orchestrator routing outcome against signals used for the task.
     * Successful outcomes nudge avg_confidence up slightly; failures nudge down.
     */
    recordFeedbackOutcome(entry) {
        const data = this.load();
        const now = entry.timestamp || new Date().toISOString();
        const signalNames = [...new Set(entry.repertoireSignals.filter(Boolean))];
        const results = [];
        for (const signalName of signalNames) {
            const signal = data.signals.find((candidate) => candidate.name === signalName);
            if (!signal)
                continue;
            const lessonText = typeof entry.lesson === 'string' ? entry.lesson.trim().slice(0, LESSON_TEXT_CAP) : '';
            if (this.rememberLesson(signal, {
                taskId: entry.taskId,
                decision: entry.success ? 'success' : 'failure',
                text: lessonText,
                at: now,
            }) === 'already') {
                continue;
            }
            const previousAvg = signal.observation_stats?.avg_confidence ?? null;
            const previousFeedback = signal.feedback_stats;
            const outcomeCount = (previousFeedback?.outcome_count ?? 0) + 1;
            signal.feedback_stats = {
                outcome_count: outcomeCount,
                success_count: (previousFeedback?.success_count ?? 0) + (entry.success ? 1 : 0),
                failure_count: (previousFeedback?.failure_count ?? 0) + (entry.success ? 0 : 1),
                last_outcome: entry.success ? 'success' : 'failure',
                last_task_id: entry.taskId,
                last_assigned_agent: entry.assignedAgent,
                last_duration_ms: entry.durationMs,
                last_seen: now,
            };
            if (signal.observation_stats) {
                const delta = entry.success
                    ? FEEDBACK_SUCCESS_CONFIDENCE_BOOST
                    : -FEEDBACK_FAILURE_CONFIDENCE_PENALTY;
                const next = Math.max(FEEDBACK_MIN_CONFIDENCE, Math.min(1, signal.observation_stats.avg_confidence + delta));
                const weight = evidenceWeight(signal.observation_stats, DEFAULT_PROMOTION_MIN_CONFIDENCE);
                signal.observation_stats = {
                    ...signal.observation_stats,
                    avg_confidence: next,
                    evidence_count: weight > 0 ? weight : 1,
                    last_seen: now,
                };
                this.writeLearnedConviction(signal.name, signal.observation_stats, signal);
            }
            results.push({
                signalName,
                previousAvgConfidence: previousAvg,
                updatedAvgConfidence: signal.observation_stats?.avg_confidence ?? null,
                feedbackStats: signal.feedback_stats,
            });
        }
        if (results.length > 0) {
            this.save(data);
        }
        return results;
    }
    /**
     * Append one graded line. A task id already on the law, or already aged into
     * the ledger, does not move the average and does not append again.
     * Past the cap, the oldest line leaves only after its id is in the ledger.
     */
    rememberLesson(signal, line) {
        if (!line.taskId)
            return 'already';
        const lessons = [...(signal.lessons ?? [])];
        const retained = new Set(signal.retained_lesson_ids ?? []);
        if (lessons.some((stored) => stored.taskId === line.taskId) || retained.has(line.taskId)) {
            return 'already';
        }
        lessons.push(line);
        const overflow = lessons.length - LESSON_LINE_CAP;
        if (overflow > 0) {
            for (const aged of lessons.splice(0, overflow))
                retained.add(aged.taskId);
        }
        signal.lessons = lessons;
        if (retained.size > 0)
            signal.retained_lesson_ids = [...retained].sort();
        return 'stored';
    }
    /**
     * Conviction that left the 0.55 floor. Not the observation counter.
     * Graded lines sit beside the average. A wake that copies the overlay floor
     * back onto dest restores both.
     */
    writeLearnedConviction(name, stats, signal) {
        if (isFactorySeedFile(this.filePath))
            return;
        const file = this.readLearnedConvictionFile();
        file.signals[name] = convictionRecord(stats, signal, file.signals[name]);
        this.writeLearnedConvictionFile(file);
    }
    /**
     * Averages already above the floor survive a flatten even when no new
     * feedback has run. Floor names, including float dust at 0.55, stay out.
     */
    seedLearnedConviction() {
        if (isFactorySeedFile(this.filePath) || !existsSync(this.filePath))
            return [];
        const data = this.load();
        const learned = this.readLearnedConvictionFile();
        const seeded = [];
        let destDirty = false;
        for (const signal of data.signals) {
            const stats = signal.observation_stats;
            if (!stats || !isAboveConfidenceFloor(stats.avg_confidence))
                continue;
            const evidence = seededEvidenceCount(stats.evidence_count);
            if (stats.evidence_count !== evidence) {
                signal.observation_stats = { ...stats, evidence_count: evidence };
                destDirty = true;
            }
            const current = signal.observation_stats;
            if (!current)
                continue;
            const row = learned.signals[signal.name];
            const rowAvg = row && typeof row.avg_confidence === 'number' ? row.avg_confidence : undefined;
            const missing = rowAvg === undefined;
            const higher = rowAvg !== undefined && current.avg_confidence > rowAvg + 1e-4;
            const rowEvidence = row && typeof row.evidence_count === 'number' && row.evidence_count > 0
                ? row.evidence_count
                : undefined;
            const nextLessons = signal.lessons?.length ? signal.lessons : validLessons(row?.lessons);
            const nextRetained = signal.retained_lesson_ids?.length
                ? signal.retained_lesson_ids
                : validLessonIds(row?.retained_lesson_ids);
            const sameLessons = JSON.stringify(nextLessons) === JSON.stringify(validLessons(row?.lessons));
            const sameRetained = JSON.stringify(nextRetained) === JSON.stringify(validLessonIds(row?.retained_lesson_ids));
            if (!missing && !higher && rowEvidence !== undefined && sameLessons && sameRetained)
                continue;
            const keptAvg = !missing && !higher && rowAvg !== undefined ? rowAvg : current.avg_confidence;
            learned.signals[signal.name] = convictionRecord({ ...current, avg_confidence: keptAvg }, { lessons: nextLessons, retained_lesson_ids: nextRetained });
            seeded.push(signal.name);
        }
        if (seeded.length > 0)
            this.writeLearnedConvictionFile(learned);
        if (destDirty)
            this.save(data);
        return seeded;
    }
    readLearnedConvictionFile() {
        const empty = { schema_version: '1', signals: {} };
        const path = this.learnedConvictionPath();
        if (!existsSync(path))
            return empty;
        try {
            const parsed = JSON.parse(readFileSync(path, 'utf8'));
            if (parsed &&
                parsed.signals &&
                typeof parsed.signals === 'object' &&
                !Array.isArray(parsed.signals)) {
                return { schema_version: '1', signals: parsed.signals };
            }
        }
        catch {
            return empty;
        }
        return empty;
    }
    writeLearnedConvictionFile(file) {
        const body = { schema_version: '1', signals: file.signals };
        writeFileSync(this.learnedConvictionPath(), `${JSON.stringify(body, null, 2)}\n`);
    }
    restoreLearnedConviction() {
        if (isFactorySeedFile(this.filePath) || !existsSync(this.filePath))
            return [];
        const path = this.learnedConvictionPath();
        if (!existsSync(path))
            return [];
        let learned;
        try {
            learned = JSON.parse(readFileSync(path, 'utf8'));
        }
        catch {
            return [];
        }
        if (!learned?.signals || typeof learned.signals !== 'object' || Array.isArray(learned.signals)) {
            return [];
        }
        const data = this.load();
        const restored = [];
        for (const [name, row] of Object.entries(learned.signals)) {
            if (!row || typeof row.avg_confidence !== 'number')
                continue;
            if (isConfidenceFloor(row.avg_confidence))
                continue;
            const signal = data.signals.find((entry) => entry.name === name);
            const stats = signal?.observation_stats;
            if (!signal || !stats)
                continue;
            const learnedLessons = validLessons(row.lessons);
            const learnedIds = validLessonIds(row.retained_lesson_ids);
            const avgOnFloor = isConfidenceFloor(stats.avg_confidence);
            const destHasLessons = (signal.lessons?.length ?? 0) > 0;
            const destLedgerEmpty = (signal.retained_lesson_ids?.length ?? 0) === 0;
            const ledgerMissing = destLedgerEmpty && learnedIds.length > 0;
            if (!avgOnFloor && destHasLessons && !ledgerMissing)
                continue;
            if (!avgOnFloor && !destHasLessons && learnedLessons.length === 0 && learnedIds.length === 0)
                continue;
            if (avgOnFloor) {
                signal.observation_stats = {
                    ...stats,
                    avg_confidence: row.avg_confidence,
                    evidence_count: typeof row.evidence_count === 'number' ? row.evidence_count : stats.evidence_count,
                };
            }
            if (!destHasLessons && learnedLessons.length > 0)
                signal.lessons = learnedLessons;
            if ((signal.retained_lesson_ids?.length ?? 0) === 0 && learnedIds.length > 0) {
                signal.retained_lesson_ids = learnedIds;
            }
            restored.push(name);
        }
        if (restored.length > 0)
            this.save(data);
        return restored;
    }
    createEmptyFile() {
        return {
            description: 'Curated high-signal primitives for Repertoire',
            schema_version: '1.1',
            last_updated: new Date().toISOString(),
            signals: [],
        };
    }
}
//# sourceMappingURL=CuratedSignalsManager.js.map