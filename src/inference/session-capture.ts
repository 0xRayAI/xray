import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { analyzeStructuralPatterns, StructuralPattern } from "./semantic-patterns.js";

export interface SessionInference {
  sessionId: string;
  timestamp: string;
  span: { from: string; to: string };
  problems: string[];
  approaches: string[];
  wrongTurns: string[];
  solutions: string[];
  reasoningChain: ReasoningLink[];
  patterns: StructuralPattern[];
  metrics: SessionMetrics;
  /** Signals this session already named. Session JSON stores this list. */
  matched_primitives?: string[];
  /** Same list after load, so callers can read either field. */
  matchedPrimitives?: string[];
  /** Inference operation this session was captured from. A second completion of the same id does not write another file. */
  operationId?: string;
}

export interface ReasoningLink {
  from: string;
  to: string;
  reasoning: string;
}

export interface SessionMetrics {
  commits: number;
  filesChanged: number;
  insertions: number;
  deletions: number;
  filesAdded: number;
  filesDeleted: number;
  uniqueDirs: number;
}

/** Date stamp plus the operation id. Callers do not append a HEAD suffix. */
export function mintSessionId(now: Date = new Date(), distinct?: string): string {
  const day = now.toISOString().slice(0, 10);
  const suffix = (distinct ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return suffix.length > 0 ? `session-${day}-${suffix}` : `session-${day}`;
}

export function captureSessionInference(
  fromRef: string,
  toRef: string,
): SessionInference | null {
  const commits = getCommitData(fromRef, toRef);
  if (commits.length === 0) return null;

  const metrics = computeMetrics(fromRef, toRef);
  const patterns = analyzeStructuralPatterns(fromRef, toRef);
  const problems = extractProblems(commits, patterns);
  const approaches = extractApproaches(commits, patterns);
  const wrongTurns = extractWrongTurns(commits, fromRef, toRef);
  const solutions = extractSolutions(commits, patterns);
  const reasoningChain = buildReasoningChain(problems, approaches, wrongTurns, solutions);

  return {
    sessionId: mintSessionId(),
    timestamp: new Date().toISOString(),
    span: { from: fromRef, to: toRef },
    problems,
    approaches,
    wrongTurns,
    solutions,
    reasoningChain,
    patterns,
    metrics,
  };
}

export function saveSessionInference(
  inference: SessionInference,
  outputDir?: string,
): string {
  const dir = outputDir || path.join(process.cwd(), "docs", "inference");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = `session-${inference.sessionId.replace(/^session-/, "")}-${Date.now()}.json`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(inference, null, 2));

  const latestPath = path.join(dir, "latest-session.json");
  fs.writeFileSync(latestPath, JSON.stringify(inference, null, 2));

  return filePath;
}

interface CommitData {
  hash: string;
  message: string;
  insertions: number;
  deletions: number;
  filesChanged: number;
}

function getCommitData(fromRef: string, toRef: string): CommitData[] {
  try {
    const log = execSync(
      `git log ${fromRef}..${toRef} --format="%H||%s" --shortstat --no-merges`,
      { encoding: "utf-8", stdio: "pipe", timeout: 5000 },
    );

    if (!log.trim()) return [];

    return log
      .split(/\n{2,}/)
      .filter((b) => b.trim().length > 0 && b.includes("||"))
      .map((block) => {
        const lines = block.trim().split("\n");
        const headerLine = lines.find((l) => l.includes("||")) || "";
        const [hash, message] = headerLine.split("||");
        const statsLine =
          lines.find(
            (l) =>
              l.includes("file") &&
              (l.includes("insertion") || l.includes("deletion")),
          ) || "";

        return {
          hash: (hash || "").trim().slice(0, 7),
          message: (message || "").trim(),
          insertions: parseInt(statsLine.match(/(\d+) insertion/)?.[1] || "0", 10),
          deletions: parseInt(statsLine.match(/(\d+) deletion/)?.[1] || "0", 10),
          filesChanged: parseInt(statsLine.match(/(\d+) files? changed/)?.[1] || "0", 10),
        };
      });
  } catch {
    return [];
  }
}

function computeMetrics(fromRef: string, toRef: string): SessionMetrics {
  try {
    const stat = execSync(`git diff --stat ${fromRef}..${toRef} --no-renames`, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 30000,
      maxBuffer: 50 * 1024 * 1024,
    });

    const finalLine = stat.trim().split("\n").pop() || "";
    const filesChanged = parseInt(finalLine.match(/(\d+) files? changed/)?.[1] || "0", 10);
    const insertions = parseInt(finalLine.match(/(\d+) insertion/)?.[1] || "0", 10);
    const deletions = parseInt(finalLine.match(/(\d+) deletion/)?.[1] || "0", 10);

    const nameStatus = execSync(
      `git diff --name-status ${fromRef}..${toRef} --no-renames`,
      { encoding: "utf-8", stdio: "pipe", timeout: 30000, maxBuffer: 50 * 1024 * 1024 },
    );

    const lines = nameStatus.split("\n").filter(Boolean);
    const filesAdded = lines.filter((l) => l.startsWith("A")).length;
    const filesDeleted = lines.filter((l) => l.startsWith("D")).length;
    const uniqueDirs = new Set(
      lines.map((l) => {
        const parts = l.split("\t")[1]!.split("/");
        return parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
      }),
    ).size;

    const commitCount = getCommitData(fromRef, toRef).length;

    return {
      commits: commitCount,
      filesChanged,
      insertions,
      deletions,
      filesAdded,
      filesDeleted,
      uniqueDirs,
    };
  } catch {
    return {
      commits: 0,
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      filesAdded: 0,
      filesDeleted: 0,
      uniqueDirs: 0,
    };
  }
}

function extractProblems(
  commits: CommitData[],
  patterns: StructuralPattern[],
): string[] {
  const problems: string[] = [];

  for (const c of commits) {
    const msg = c.message;
    const msgLower = msg.toLowerCase();

    const isFixCommit = /^[a-f0-9]+:? ?fix[\s:(/]/i.test(msg) || msgLower.startsWith("fix") || msgLower.includes("bug fix") || msgLower.includes("bugfix");
    if (isFixCommit) {
      problems.push(`Bug: ${msg} (${c.hash})`);
    }
    if (msgLower.includes("remove") && (msgLower.includes("circular") || msgLower.includes("dead code"))) {
      problems.push(`Code health: ${msg} (${c.hash})`);
    }
    if (msgLower.includes("stub") || msgLower.includes("placeholder")) {
      problems.push(`Incomplete implementation: ${msg} (${c.hash})`);
    }
  }

  for (const p of patterns) {
    if (p.name === "Dead Code Removal") {
      problems.push(`Accumulated dead code: ${p.evidence[0]}`);
    }
    if (p.name === "Stability Sprint") {
      problems.push(`Technical debt requiring stability focus`);
    }
  }

  if (problems.length === 0 && commits.length > 3) {
    problems.push(`General development session: ${commits.length} commits`);
  }

  return [...new Set(problems)];
}

function extractApproaches(
  commits: CommitData[],
  patterns: StructuralPattern[],
): string[] {
  const approaches: string[] = [];

  for (const p of patterns) {
    switch (p.name) {
      case "Extract Method":
        approaches.push(`Extract methods into dedicated files to reduce monolith size`);
        break;
      case "Registry Pattern":
        approaches.push(`Replace switch statements with Map-based registry for O(1) dispatch`);
        break;
      case "Facade Pattern":
        approaches.push(`Thin facade + extracted modules: coordinator delegates, doesn't implement`);
        break;
      case "Convention over Configuration":
        approaches.push(`Auto-discover implementations at runtime to eliminate manual registration`);
        break;
      case "Dependency Injection":
        approaches.push(`Declare dependencies explicitly for testability and auto-wiring`);
        break;
      case "Dead Code Removal":
        approaches.push(`Delete unused code to reduce maintenance burden`);
        break;
      case "Test Coverage Expansion":
        approaches.push(`Add tests alongside new implementations`);
        break;
    }
  }

  for (const c of commits) {
    const msg = c.message.toLowerCase();
    if (msg.includes("sync") && msg.includes("version")) {
      approaches.push(`Automate version synchronization across config files`);
    }
    if (msg.includes("append") && (msg.includes("doc") || msg.includes("agent"))) {
      approaches.push(`Append-only doc updates to prevent data loss`);
    }
    if (msg.includes("guard")) {
      approaches.push(`Structural guard to enforce invariants`);
    }
  }

  return [...new Set(approaches)];
}

function extractWrongTurns(
  commits: CommitData[],
  fromRef: string,
  toRef: string,
): string[] {
  const wrongTurns: string[] = [];

  try {
    const log = execSync(
      `git log ${fromRef}..${toRef} --format="%s" --no-merges`,
      { encoding: "utf-8", stdio: "pipe", timeout: 5000 },
    );

    const messages = log.split("\n").filter(Boolean).map((m) => m.toLowerCase());

    if (messages.some((m) => m.includes("revert"))) {
      wrongTurns.push("Approach was reverted — initial direction was wrong");
    }

    const fixAfterFeature = findFixAfterFeature(messages);
    if (fixAfterFeature) {
      wrongTurns.push(fixAfterFeature);
    }
  } catch {
    // ignore
  }

  for (const c of commits) {
    const msg = c.message.toLowerCase();
    if (msg.includes("wrong") || msg.includes("incorrect") || msg.includes("oops")) {
      wrongTurns.push(`Self-corrected: ${c.message} (${c.hash})`);
    }
  }

  const allMessages = commits.map((c) => c.message.toLowerCase());
  const hasPathFix = allMessages.filter((m) => m.includes("path") && (m.includes("fix") || m.includes("bogus"))).length;
  if (hasPathFix > 0) {
    wrongTurns.push("Path handling bug: absolute vs relative path confusion");
  }

  const hasFlakyFix = allMessages.filter((m) => m.includes("timeout") || m.includes("flaky")).length;
  if (hasFlakyFix > 0) {
    wrongTurns.push(`Timing issue: test assumptions violated in parallel execution`);
  }

  return [...new Set(wrongTurns)];
}

function findFixAfterFeature(messages: string[]): string | null {
  let lastFeatureIdx = -1;
  let firstFixAfter = -1;

  for (let i = 0; i < messages.length; i++) {
    if (
      messages[i]!.includes("feat") ||
      messages[i]!.includes("add") ||
      messages[i]!.includes("implement")
    ) {
      lastFeatureIdx = i;
    }
    if (
      lastFeatureIdx >= 0 &&
      messages[i]!.includes("fix") &&
      firstFixAfter < 0
    ) {
      firstFixAfter = i;
    }
  }

  if (lastFeatureIdx >= 0 && firstFixAfter > lastFeatureIdx) {
    return `Feature commit followed by fix — incomplete initial implementation`;
  }
  return null;
}

function extractSolutions(
  commits: CommitData[],
  patterns: StructuralPattern[],
): string[] {
  const solutions: string[] = [];

  for (const p of patterns) {
    solutions.push(`Applied ${p.name} pattern (confidence: ${Math.round(p.confidence * 100)}%)`);
  }

  for (const c of commits) {
    const msg = c.message.toLowerCase();
    if (msg.includes("create") || msg.includes("add script")) {
      solutions.push(`New tooling: ${c.message} (${c.hash})`);
    }
    if (msg.includes("wire") || msg.includes("integrate")) {
      solutions.push(`Integration: ${c.message} (${c.hash})`);
    }
    if (msg.includes("consolidat")) {
      solutions.push(`Consolidation: ${c.message} (${c.hash})`);
    }
  }

  if (solutions.length === 0 && commits.length > 0) {
    solutions.push(`${commits.length} commits shipped successfully`);
  }

  return [...new Set(solutions)];
}

function buildReasoningChain(
  problems: string[],
  approaches: string[],
  wrongTurns: string[],
  solutions: string[],
): ReasoningLink[] {
  const chain: ReasoningLink[] = [];

  for (const approach of approaches) {
    const matchingSolution = solutions.find(
      (s) =>
        approaches.indexOf(approach) === solutions.indexOf(s) ||
        s.toLowerCase().includes(approachKeyword(approach)),
    );
    if (matchingSolution) {
      chain.push({
        from: "approach",
        to: "solution",
        reasoning: `${approach} → ${matchingSolution}`,
      });
    } else {
      chain.push({
        from: "problem",
        to: "approach",
        reasoning: approach,
      });
    }
  }

  for (const wt of wrongTurns) {
    chain.push({
      from: "approach",
      to: "wrong_turn",
      reasoning: wt,
    });
  }

  return chain;
}

/** Same cap `lessonTrace` applies before a vote can store the line. */
const OPERATION_LESSON_CAP = 400;

export interface OperationCaptureInput {
  operationId: string;
  promptsDir: string;
  inferenceDir: string;
  signalNames: readonly string[];
}

/**
 * One corpus session for a finished inference operation.
 * Speech comes from that run's prompt result text. No speech, no file.
 * Does not grade. The caller runs the cycle before it returns.
 */
export function captureCompletedInferenceOperation(input: OperationCaptureInput): string | null {
  const operationId = input.operationId.trim();
  if (!operationId) return null;
  if (operationAlreadyCaptured(input.inferenceDir, operationId)) return null;

  const raw = readOperationSpeech(input.promptsDir, operationId);
  const speech = parseOperationSpeech(raw);
  const heard = speech.approaches.length + speech.solutions.length + speech.wrongTurns.length;
  if (!raw.trim() || heard === 0) return null;

  const named = storedSignalsNamedBySpeech(raw, input.signalNames);
  const now = new Date().toISOString();
  const session: SessionInference = {
    sessionId: mintSessionId(new Date(), operationId),
    timestamp: now,
    span: { from: operationId, to: operationId },
    problems: [],
    approaches: speech.approaches,
    wrongTurns: speech.wrongTurns,
    solutions: speech.solutions,
    reasoningChain: [],
    patterns: [],
    metrics: {
      commits: 0,
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      filesAdded: 0,
      filesDeleted: 0,
      uniqueDirs: 0,
    },
    matched_primitives: named,
    matchedPrimitives: named,
    operationId,
  };
  return saveSessionInference(session, input.inferenceDir);
}

function operationAlreadyCaptured(inferenceDir: string, operationId: string): boolean {
  if (!fs.existsSync(inferenceDir)) return false;
  for (const name of fs.readdirSync(inferenceDir)) {
    if (!name.startsWith("session-") || !name.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(inferenceDir, name), "utf8")) as { operationId?: unknown };
      if (parsed.operationId === operationId) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function readOperationSpeech(promptsDir: string, operationId: string): string {
  if (!fs.existsSync(promptsDir)) return "";
  const chunks: string[] = [];
  for (const name of fs.readdirSync(promptsDir).sort()) {
    const full = path.join(promptsDir, name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    let text = "";
    try {
      text = fs.readFileSync(full, "utf8");
    } catch {
      continue;
    }
    if (name === `${operationId}.result.md` || name === `${operationId}.result.txt`) {
      chunks.push(text);
      continue;
    }
    if (/\.result\.(md|txt)$/i.test(name) && operationDeclared(text) === operationId) {
      chunks.push(text);
      continue;
    }
    if (name.endsWith(".md") && !name.includes(".result.")) {
      const section = resultSection(text);
      if (section && (operationDeclared(section) === operationId || operationDeclared(text) === operationId)) {
        chunks.push(section);
      }
    }
  }
  return chunks.join("\n").trim();
}

function operationDeclared(text: string): string | null {
  const match = /^operation:\s*(\S+)\s*$/im.exec(text);
  return match?.[1] ?? null;
}

function resultSection(text: string): string {
  const parts = text.split(/\n##\s+(?:Result|Speech)\s*\n/i);
  if (parts.length < 2) return "";
  return parts.slice(1).join("\n").trim();
}

interface OperationSpeech {
  approaches: string[];
  solutions: string[];
  wrongTurns: string[];
}

function parseOperationSpeech(raw: string): OperationSpeech {
  const body = raw
    .split("\n")
    .filter((line) => !/^operation:\s*\S+\s*$/i.test(line.trim()))
    .join("\n")
    .trim();
  const buckets: OperationSpeech = { approaches: [], solutions: [], wrongTurns: [] };
  if (!body) return buckets;

  let current: keyof OperationSpeech | null = null;
  let labeled = false;
  const sectionLines: string[] = [];
  const flush = (): void => {
    if (!current) {
      sectionLines.length = 0;
      return;
    }
    const text = fewSentences(sectionLines.join(" "));
    sectionLines.length = 0;
    if (text) buckets[current].push(text);
  };

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const inline = /^([^:]{2,40}):\s+(.+)$/.exec(trimmed);
    if (inline) {
      const bucket = bucketForLabel(inline[1] ?? "");
      if (bucket) {
        flush();
        current = bucket;
        labeled = true;
        sectionLines.push(inline[2] ?? "");
        continue;
      }
    }
    const heading = /^(?:#{1,3}\s*)(.+)$/.exec(trimmed);
    if (heading) {
      const bucket = bucketForLabel(heading[1] ?? "");
      if (bucket) {
        flush();
        current = bucket;
        labeled = true;
        continue;
      }
    }
    if (current) sectionLines.push(trimmed);
  }
  flush();

  if (!labeled) {
    const text = fewSentences(body);
    if (text) buckets.approaches.push(text);
  }
  return buckets;
}

function bucketForLabel(label: string): keyof OperationSpeech | null {
  const lower = label.toLowerCase().replace(/^#+\s*/, "").replace(/:$/, "").trim();
  if (/^(tried|approaches?|what was tried)$/.test(lower)) return "approaches";
  if (/^(worked|solutions?|what worked)$/.test(lower)) return "solutions";
  if (/^(failed|wrong turns?|what failed)$/.test(lower)) return "wrongTurns";
  return null;
}

function fewSentences(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const sentences = flat.split(/(?<=[.!?])\s+/).filter((part) => part.length > 0).slice(0, 4);
  const joined = sentences.join(" ");
  if (joined.length <= OPERATION_LESSON_CAP) return joined;
  return joined.slice(0, OPERATION_LESSON_CAP);
}

/** Id, or that id with hyphens read as spaces. Same hit `patternsFromGit` stores for the proposal generator. */
export function reflectionSessionId(relativePath: string): string {
  const slug = relativePath
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `session-reflection-${slug}`;
}

/** Reflection markdown is the speech. No session file is written. */
export function captureReflectionInference(input: {
  relativePath: string;
  text: string;
  modifiedAt: Date;
  signalNames: readonly string[];
}): SessionInference | null {
  const speech = parseOperationSpeech(input.text);
  const heard = speech.approaches.length + speech.solutions.length + speech.wrongTurns.length;
  if (heard === 0) return null;
  const named = storedSignalsNamedBySpeech(
    [...speech.approaches, ...speech.solutions, ...speech.wrongTurns].join(" "),
    input.signalNames,
  );
  const emptyMetrics: SessionMetrics = {
    commits: 0,
    filesChanged: 0,
    insertions: 0,
    deletions: 0,
    filesAdded: 0,
    filesDeleted: 0,
    uniqueDirs: 0,
  };
  return {
    sessionId: reflectionSessionId(input.relativePath),
    timestamp: input.modifiedAt.toISOString(),
    span: { from: "reflection", to: input.relativePath },
    problems: [],
    approaches: speech.approaches,
    wrongTurns: speech.wrongTurns,
    solutions: speech.solutions,
    reasoningChain: [],
    patterns: [],
    metrics: emptyMetrics,
    matched_primitives: named,
    matchedPrimitives: named,
  };
}

/** The gauge file. One session log per reflection, skipped when that id is already on disk. */
export function saveReflectionSession(session: SessionInference, inferenceDir: string): string | null {
  if (reflectionAlreadySaved(inferenceDir, session.sessionId)) return null;
  return saveSessionInference(session, inferenceDir);
}

function reflectionAlreadySaved(inferenceDir: string, sessionId: string): boolean {
  if (!fs.existsSync(inferenceDir)) return false;
  for (const name of fs.readdirSync(inferenceDir)) {
    if (!name.startsWith("session-") || !name.endsWith(".json") || name === "latest-session.json") continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(inferenceDir, name), "utf8")) as { sessionId?: unknown };
      if (parsed.sessionId === sessionId) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function storedSignalsNamedBySpeech(speech: string, signalNames: readonly string[]): string[] {
  const hay = speech.toLowerCase();
  const named: string[] = [];
  for (const name of signalNames) {
    const id = name.trim().toLowerCase();
    if (!id) continue;
    const spaced = id.replace(/-/g, " ");
    if (hay.includes(id) || (spaced !== id && hay.includes(spaced))) named.push(name.trim());
  }
  return [...new Set(named)];
}

function approachKeyword(approach: string): string {
  const lower = approach.toLowerCase();
  if (lower.includes("extract")) return "extract";
  if (lower.includes("registry") || lower.includes("map")) return "registry";
  if (lower.includes("facade") || lower.includes("thin")) return "facade";
  if (lower.includes("convention") || lower.includes("discover")) return "convention";
  if (lower.includes("dependen") || lower.includes("inject")) return "dependenc";
  if (lower.includes("dead code") || lower.includes("delete")) return "dead code";
  if (lower.includes("test")) return "test";
  if (lower.includes("version") || lower.includes("sync")) return "version";
  if (lower.includes("append")) return "append";
  if (lower.includes("guard")) return "guard";
  return "";
}
