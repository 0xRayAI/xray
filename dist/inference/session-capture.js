import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { analyzeStructuralPatterns } from "./semantic-patterns.js";
export function captureSessionInference(fromRef, toRef) {
    const commits = getCommitData(fromRef, toRef);
    if (commits.length === 0)
        return null;
    const metrics = computeMetrics(fromRef, toRef);
    const patterns = analyzeStructuralPatterns(fromRef, toRef);
    const problems = extractProblems(commits, patterns);
    const approaches = extractApproaches(commits, patterns);
    const wrongTurns = extractWrongTurns(commits, fromRef, toRef);
    const solutions = extractSolutions(commits, patterns);
    const reasoningChain = buildReasoningChain(problems, approaches, wrongTurns, solutions);
    return {
        sessionId: `session-${new Date().toISOString().slice(0, 10)}`,
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
export function saveSessionInference(inference, outputDir) {
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
function getCommitData(fromRef, toRef) {
    try {
        const log = execSync(`git log ${fromRef}..${toRef} --format="%H||%s" --shortstat --no-merges`, { encoding: "utf-8", stdio: "pipe", timeout: 5000 });
        if (!log.trim())
            return [];
        return log
            .split(/\n{2,}/)
            .filter((b) => b.trim().length > 0 && b.includes("||"))
            .map((block) => {
            const lines = block.trim().split("\n");
            const headerLine = lines.find((l) => l.includes("||")) || "";
            const [hash, message] = headerLine.split("||");
            const statsLine = lines.find((l) => l.includes("file") &&
                (l.includes("insertion") || l.includes("deletion"))) || "";
            return {
                hash: (hash || "").trim().slice(0, 7),
                message: (message || "").trim(),
                insertions: parseInt(statsLine.match(/(\d+) insertion/)?.[1] || "0", 10),
                deletions: parseInt(statsLine.match(/(\d+) deletion/)?.[1] || "0", 10),
                filesChanged: parseInt(statsLine.match(/(\d+) files? changed/)?.[1] || "0", 10),
            };
        });
    }
    catch {
        return [];
    }
}
function computeMetrics(fromRef, toRef) {
    try {
        const stat = execSync(`git diff --stat ${fromRef}..${toRef} --no-renames`, {
            encoding: "utf-8",
            stdio: "pipe",
            timeout: 5000,
        });
        const finalLine = stat.trim().split("\n").pop() || "";
        const filesChanged = parseInt(finalLine.match(/(\d+) files? changed/)?.[1] || "0", 10);
        const insertions = parseInt(finalLine.match(/(\d+) insertion/)?.[1] || "0", 10);
        const deletions = parseInt(finalLine.match(/(\d+) deletion/)?.[1] || "0", 10);
        const nameStatus = execSync(`git diff --name-status ${fromRef}..${toRef} --no-renames`, { encoding: "utf-8", stdio: "pipe", timeout: 5000 });
        const lines = nameStatus.split("\n").filter(Boolean);
        const filesAdded = lines.filter((l) => l.startsWith("A")).length;
        const filesDeleted = lines.filter((l) => l.startsWith("D")).length;
        const uniqueDirs = new Set(lines.map((l) => {
            const parts = l.split("\t")[1].split("/");
            return parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
        })).size;
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
    }
    catch {
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
function extractProblems(commits, patterns) {
    const problems = [];
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
function extractApproaches(commits, patterns) {
    const approaches = [];
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
function extractWrongTurns(commits, fromRef, toRef) {
    const wrongTurns = [];
    try {
        const log = execSync(`git log ${fromRef}..${toRef} --format="%s" --no-merges`, { encoding: "utf-8", stdio: "pipe", timeout: 5000 });
        const messages = log.split("\n").filter(Boolean).map((m) => m.toLowerCase());
        if (messages.some((m) => m.includes("revert"))) {
            wrongTurns.push("Approach was reverted — initial direction was wrong");
        }
        const fixAfterFeature = findFixAfterFeature(messages);
        if (fixAfterFeature) {
            wrongTurns.push(fixAfterFeature);
        }
    }
    catch {
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
        wrongTurns.push(`Path handling bug: absolute vs relative path confusion (${hasPathFix} commits affected)`);
    }
    const hasFlakyFix = allMessages.filter((m) => m.includes("timeout") || m.includes("flaky")).length;
    if (hasFlakyFix > 0) {
        wrongTurns.push(`Timing issue: test assumptions violated in parallel execution`);
    }
    return [...new Set(wrongTurns)];
}
function findFixAfterFeature(messages) {
    let lastFeatureIdx = -1;
    let firstFixAfter = -1;
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].includes("feat") ||
            messages[i].includes("add") ||
            messages[i].includes("implement")) {
            lastFeatureIdx = i;
        }
        if (lastFeatureIdx >= 0 &&
            messages[i].includes("fix") &&
            firstFixAfter < 0) {
            firstFixAfter = i;
        }
    }
    if (lastFeatureIdx >= 0 && firstFixAfter > lastFeatureIdx) {
        return `Feature commit followed by fix — incomplete initial implementation`;
    }
    return null;
}
function extractSolutions(commits, patterns) {
    const solutions = [];
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
function buildReasoningChain(problems, approaches, wrongTurns, solutions) {
    const chain = [];
    for (const approach of approaches) {
        const matchingSolution = solutions.find((s) => approaches.indexOf(approach) === solutions.indexOf(s) ||
            s.toLowerCase().includes(approachKeyword(approach)));
        if (matchingSolution) {
            chain.push({
                from: "approach",
                to: "solution",
                reasoning: `${approach} → ${matchingSolution}`,
            });
        }
        else {
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
function approachKeyword(approach) {
    const lower = approach.toLowerCase();
    if (lower.includes("extract"))
        return "extract";
    if (lower.includes("registry") || lower.includes("map"))
        return "registry";
    if (lower.includes("facade") || lower.includes("thin"))
        return "facade";
    if (lower.includes("convention") || lower.includes("discover"))
        return "convention";
    if (lower.includes("dependen") || lower.includes("inject"))
        return "dependenc";
    if (lower.includes("dead code") || lower.includes("delete"))
        return "dead code";
    if (lower.includes("test"))
        return "test";
    if (lower.includes("version") || lower.includes("sync"))
        return "version";
    if (lower.includes("append"))
        return "append";
    if (lower.includes("guard"))
        return "guard";
    return "";
}
//# sourceMappingURL=session-capture.js.map