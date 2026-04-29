import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class StorytellingTriggerProcessor extends PostProcessor {
    name = "storytelling-trigger";
    priority = 5;
    config = null;
    reflectionsDir = "docs/reflections";
    deepReflectionsDir = "docs/reflections/deep";
    constructor() {
        super();
        this.loadConfig();
    }
    loadConfig() {
        try {
            const configPath = this.resolveConfigPath("features.json");
            if (configPath && fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, "utf-8");
                const parsed = JSON.parse(content);
                if (parsed.storytelling) {
                    this.config = parsed.storytelling;
                }
            }
        }
        catch (error) {
            frameworkLogger.log("storytelling-trigger", "config-load-failed", "warning", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    resolveConfigPath(filename) {
        const candidates = [
            path.join(process.cwd(), ".strray", filename),
            path.join(process.cwd(), ".opencode", "strray", filename),
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate))
                return candidate;
        }
        return null;
    }
    async run(context) {
        if (!this.config?.enabled) {
            return { message: "Storytelling triggers disabled", triggers: [] };
        }
        const generated = [];
        const commitReflection = this.reflectOnCommits();
        if (commitReflection) {
            generated.push(commitReflection);
            frameworkLogger.log("storytelling-trigger", "commit-reflection-generated", "info", {
                file: commitReflection,
            });
        }
        const releaseReflection = this.reflectOnRelease();
        if (releaseReflection) {
            generated.push(releaseReflection);
            frameworkLogger.log("storytelling-trigger", "release-reflection-generated", "info", {
                file: releaseReflection,
            });
        }
        return {
            message: generated.length > 0
                ? `Generated ${generated.length} reflection(s)`
                : "No reflection triggers fired",
            triggers: generated.map(f => path.basename(f)),
            generated,
        };
    }
    reflectOnCommits() {
        const lastReflection = this.getMostRecentReflectionFile();
        const sinceRef = lastReflection
            ? this.getFileCommitHash(lastReflection)
            : null;
        const commits = sinceRef
            ? this.getCommitsBetween(sinceRef, "HEAD")
            : this.getRecentCommits(25);
        if (commits.length === 0)
            return null;
        const threshold = this.config?.reflection_triggers.commit_count?.threshold ?? 10;
        if (commits.length < threshold)
            return null;
        const diff = this.summarizeCommits(commits);
        const slug = `commit-cadence`;
        const dateStr = new Date().toISOString().slice(0, 10);
        const dir = path.join(process.cwd(), this.reflectionsDir);
        const filename = `auto-${slug}-${dateStr}.md`;
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath))
            return null;
        const content = this.synthesizeReflection({
            cadence: "commit",
            commits,
            diff,
            sinceRef: sinceRef || "start of history",
            untilRef: "HEAD",
        });
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content);
        return filePath;
    }
    reflectOnRelease() {
        const lastTag = this.getLastTag();
        if (!lastTag)
            return null;
        const commits = this.getCommitsBetween(lastTag, "HEAD");
        if (commits.length === 0)
            return null;
        const diff = this.summarizeCommits(commits);
        const version = lastTag.replace(/^v/, "");
        const dateStr = new Date().toISOString().slice(0, 10);
        const dir = path.join(process.cwd(), this.deepReflectionsDir);
        const filename = `release-v${version}-to-head-${dateStr}.md`;
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath))
            return null;
        const content = this.synthesizeReflection({
            cadence: "release",
            commits,
            diff,
            sinceRef: lastTag,
            untilRef: "HEAD",
            version,
        });
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content);
        return filePath;
    }
    synthesizeReflection(data) {
        const { cadence, commits, diff, sinceRef, untilRef, version } = data;
        const now = new Date().toISOString();
        const lines = [];
        if (cadence === "release") {
            lines.push(`# Release Reflection: ${version} → HEAD`);
            lines.push("");
            lines.push(`**Generated:** ${now}`);
            lines.push(`**Cadence:** release (since tag ${sinceRef})`);
            lines.push(`**Commits examined:** ${commits.length}`);
            lines.push(`**Span:** ${sinceRef}..${untilRef}`);
        }
        else {
            lines.push(`# Commit Cadence Reflection`);
            lines.push("");
            lines.push(`**Generated:** ${now}`);
            lines.push(`**Cadence:** commit (since last reflection)`);
            lines.push(`**Commits examined:** ${commits.length}`);
            lines.push(`**Span:** ${sinceRef}..${untilRef}`);
        }
        lines.push("");
        lines.push("## Scope");
        lines.push("");
        lines.push(`- **${diff.totalCommits} commits** with **${diff.totalFilesChanged} file changes**`);
        lines.push(`- **+${diff.totalInsertions} insertions / -${diff.totalDeletions} deletions**`);
        lines.push(`- **${diff.filesAdded.length} files added, ${diff.filesModified.length} modified, ${diff.filesDeleted.length} deleted**`);
        lines.push("");
        if (diff.uniqueDirs.length > 0) {
            lines.push("## Areas Touched");
            lines.push("");
            for (const dir of diff.uniqueDirs.slice(0, 15)) {
                const count = [...diff.filesAdded, ...diff.filesModified].filter(f => f.startsWith(dir)).length;
                lines.push(`- \`${dir}\` (${count} files)`);
            }
            lines.push("");
        }
        lines.push("## Commit Chronicle");
        lines.push("");
        for (const commit of commits) {
            const files = commit.fileNames.length > 5
                ? commit.fileNames.slice(0, 5).join(", ") + ` +${commit.fileNames.length - 5} more`
                : commit.fileNames.join(", ");
            lines.push(`- **${commit.message}** (${commit.hash})`);
            lines.push(`  ${commit.filesChanged} files: ${files}`);
            lines.push("");
        }
        lines.push("## Files Added");
        lines.push("");
        if (diff.filesAdded.length === 0) {
            lines.push("*(none)*");
        }
        else {
            for (const f of diff.filesAdded) {
                lines.push(`- \`${f}\``);
            }
        }
        lines.push("");
        lines.push("## Files Modified");
        lines.push("");
        if (diff.filesModified.length > 20) {
            for (const f of diff.filesModified.slice(0, 20)) {
                lines.push(`- \`${f}\``);
            }
            lines.push(`- ... and ${diff.filesModified.length - 20} more`);
        }
        else if (diff.filesModified.length === 0) {
            lines.push("*(none)*");
        }
        else {
            for (const f of diff.filesModified) {
                lines.push(`- \`${f}\``);
            }
        }
        lines.push("");
        if (diff.filesDeleted.length > 0) {
            lines.push("## Files Deleted");
            lines.push("");
            for (const f of diff.filesDeleted) {
                lines.push(`- \`${f}\``);
            }
            lines.push("");
        }
        lines.push("## Patterns Observed");
        lines.push("");
        const patterns = this.detectPatterns(commits, diff);
        for (const pattern of patterns) {
            lines.push(`- ${pattern}`);
        }
        lines.push("");
        lines.push("## Key Decisions");
        lines.push("");
        const decisions = this.extractDecisions(commits);
        if (decisions.length === 0) {
            lines.push("*(extracted from commit messages — add detail in follow-up)*");
        }
        for (const d of decisions) {
            lines.push(`- ${d}`);
        }
        lines.push("");
        lines.push("## Inference Notes");
        lines.push("");
        lines.push("*(This section captures what an AI agent would infer from the above changes.)");
        lines.push("Run the storyteller skill against this file to synthesize deeper analysis.)*");
        lines.push("");
        lines.push("---");
        lines.push(`*Generated by StorytellingTriggerProcessor — ${cadence} cadence — ${now}*`);
        return lines.join("\n");
    }
    detectPatterns(commits, diff) {
        const patterns = [];
        if (diff.filesAdded.some(f => f.includes("implementations/"))) {
            patterns.push("New processor implementations added — system extensibility increasing");
        }
        if (diff.filesAdded.some(f => f.includes("__tests__/"))) {
            patterns.push("New test files created — test coverage expanding");
        }
        if (diff.filesDeleted.length > 0) {
            patterns.push(`${diff.filesDeleted.length} files deleted — dead code removal or refactoring`);
        }
        if (diff.totalDeletions > diff.totalInsertions * 1.5) {
            patterns.push(`Net code reduction: ${diff.totalDeletions - diff.totalInsertions} lines removed — simplification effort`);
        }
        if (diff.uniqueDirs.some(d => d.includes("processors"))) {
            patterns.push("Processor system modified — pipeline architecture evolving");
        }
        if (diff.uniqueDirs.some(d => d.includes("reporting"))) {
            patterns.push("Reporting system modified — output quality being addressed");
        }
        if (diff.uniqueDirs.some(d => d.includes("security"))) {
            patterns.push("Security-related changes detected");
        }
        if (commits.some(c => c.message.toLowerCase().includes("fix"))) {
            patterns.push("Bug fixes present — stability improvement");
        }
        if (commits.some(c => c.message.toLowerCase().includes("refactor"))) {
            patterns.push("Refactoring detected — architectural debt being addressed");
        }
        if (commits.some(c => c.message.includes("v1.") || c.message.includes("release"))) {
            patterns.push("Version bumps/releases present — release cadence active");
        }
        if (diff.filesModified.some(f => f.includes("processor-manager"))) {
            patterns.push("Processor manager core modified — orchestration layer changing");
        }
        if (diff.filesModified.some(f => f.includes("AGENTS.md"))) {
            patterns.push("AGENTS.md updated — agent documentation evolving");
        }
        if (diff.uniqueDirs.some(d => d.includes("integrations"))) {
            patterns.push("Integration layer modified — external system interfaces changing");
        }
        if (patterns.length === 0) {
            patterns.push("Standard development activity — no strong architectural patterns detected");
        }
        return patterns;
    }
    extractDecisions(commits) {
        const decisions = [];
        for (const commit of commits) {
            const msg = commit.message;
            if (msg.includes("extract")) {
                decisions.push(`Extraction: ${msg}`);
            }
            else if (msg.includes("replace") || msg.includes("refactor")) {
                decisions.push(`Structural change: ${msg}`);
            }
            else if (msg.includes("→")) {
                decisions.push(`Transition: ${msg}`);
            }
            else if (msg.includes("fix")) {
                decisions.push(`Fix: ${msg}`);
            }
            else if (msg.includes("delete") || msg.includes("remove")) {
                decisions.push(`Removal: ${msg}`);
            }
        }
        return decisions;
    }
    getCommitsBetween(from, to) {
        try {
            const log = this.git(`git log ${from}..${to} --format="%H||%s||%an||%aI" --shortstat --no-merges`);
            if (!log)
                return [];
            const commitBlocks = log.split(/\n{2,}/).filter((b) => b.trim().length > 0 && b.includes("||"));
            return commitBlocks.map((block) => {
                const lines = block.trim().split("\n");
                const headerLine = lines.find((l) => l.includes("||")) || "";
                const [hash, message, author, date] = headerLine.split("||");
                const statsLine = lines.find((l) => l.includes("file") && (l.includes("insertion") || l.includes("deletion") || l.includes("changed"))) || "";
                const filesChanged = parseInt(statsLine.match(/(\d+) files? changed/)?.[1] || "0", 10);
                const insertions = parseInt(statsLine.match(/(\d+) insertion/)?.[1] || "0", 10);
                const deletions = parseInt(statsLine.match(/(\d+) deletion/)?.[1] || "0", 10);
                let fileNames = [];
                try {
                    const shortHash = (hash || "").slice(0, 7);
                    const namesOutput = this.git(`git diff --name-only ${shortHash}~1 ${shortHash} 2>/dev/null`);
                    fileNames = namesOutput ? namesOutput.split("\n").filter(Boolean) : [];
                }
                catch { /* empty */ }
                return {
                    hash: (hash || "").slice(0, 7),
                    message: message || "",
                    author: author || "",
                    date: date || "",
                    filesChanged,
                    insertions,
                    deletions,
                    fileNames,
                };
            });
        }
        catch {
            return [];
        }
    }
    getRecentCommits(count) {
        try {
            const hash = this.git("git rev-list --max-parents=0 HEAD");
            if (!hash)
                return [];
            const firstCommit = hash.split("\n")[0].trim();
            return this.getCommitsBetween(firstCommit, "HEAD").slice(0, count);
        }
        catch {
            return [];
        }
    }
    summarizeCommits(commits) {
        const allFiles = new Map();
        for (const commit of commits) {
            for (const file of commit.fileNames) {
                if (!allFiles.has(file)) {
                    allFiles.set(file, "modified");
                }
            }
        }
        const filesAdded = [];
        const filesModified = [];
        const filesDeleted = [];
        try {
            const from = commits.length > 0 ? `${commits[commits.length - 1].hash}~1` : "HEAD~1";
            const diffNames = this.git(`git diff --name-status ${from} HEAD`);
            if (diffNames) {
                for (const line of diffNames.split("\n").filter(Boolean)) {
                    const [status, filePath] = line.split("\t");
                    if (status === "A")
                        filesAdded.push(filePath);
                    else if (status === "D")
                        filesDeleted.push(filePath);
                    else if (status === "M")
                        filesModified.push(filePath);
                    else
                        filesModified.push(filePath);
                }
            }
        }
        catch {
            for (const [file] of allFiles) {
                filesModified.push(file);
            }
        }
        const uniqueDirs = [...new Set([...filesAdded, ...filesModified, ...filesDeleted]
                .map((f) => {
                const parts = f.split("/");
                return parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
            }))].sort();
        return {
            totalCommits: commits.length,
            totalFilesChanged: allFiles.size,
            totalInsertions: commits.reduce((sum, c) => sum + c.insertions, 0),
            totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0),
            filesAdded,
            filesModified,
            filesDeleted,
            uniqueDirs,
            commitSubjects: commits.map((c) => c.message),
        };
    }
    getLastTag() {
        return this.git("git describe --tags --abbrev=0 2>/dev/null");
    }
    getFileCommitHash(filePath) {
        return this.git(`git log -1 --format="%H" -- ${filePath}`);
    }
    getMostRecentReflectionFile() {
        let mostRecent = null;
        let mostRecentTime = 0;
        for (const dir of [this.reflectionsDir, this.deepReflectionsDir]) {
            const fullPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(fullPath))
                continue;
            const files = fs.readdirSync(fullPath).filter((f) => f.endsWith(".md"));
            for (const file of files) {
                const filePath = path.join(fullPath, file);
                const stat = fs.statSync(filePath);
                if (stat.mtime.getTime() > mostRecentTime) {
                    mostRecentTime = stat.mtime.getTime();
                    mostRecent = filePath;
                }
            }
        }
        return mostRecent;
    }
    git(command) {
        try {
            return execSync(command, {
                encoding: "utf-8",
                stdio: "pipe",
                timeout: 5000,
            }).trim() || null;
        }
        catch {
            return null;
        }
    }
    static suggestStoryType(context) {
        if (context.isPublishing)
            return "saga";
        if (context.fileCount && context.fileCount > 15)
            return "journey";
        if (context.commitCount && context.commitCount > 10)
            return "reflection";
        return "reflection";
    }
    static getStoryTypeMeta(storyType) {
        const defaults = {
            reflection: {
                location: "docs/reflections/",
                minWords: 2000,
                idealWords: 5000,
                framework: "three_act_structure",
                template: "reflection",
            },
            saga: {
                location: "docs/reflections/deep/",
                minWords: 5000,
                idealWords: 15000,
                framework: "hero_journey",
                template: "saga",
            },
            journey: {
                location: "docs/reflections/deep/",
                minWords: 1500,
                idealWords: 4000,
                framework: "three_act_structure",
                template: "journey",
            },
            narrative: {
                location: "docs/reflections/",
                minWords: 1000,
                idealWords: 3000,
                framework: "three_act_structure",
                template: "narrative",
            },
        };
        return defaults[storyType] ?? defaults.reflection;
    }
}
export default StorytellingTriggerProcessor;
//# sourceMappingURL=storytelling-trigger-processor.js.map