import { execSync } from "child_process";
export function analyzeStructuralPatterns(fromRef, toRef) {
    const changes = getFileChanges(fromRef, toRef);
    if (changes.length === 0)
        return [];
    const patterns = [];
    const extractMethod = detectExtractMethod(changes, fromRef, toRef);
    if (extractMethod)
        patterns.push(extractMethod);
    const registry = detectRegistryPattern(fromRef, toRef);
    if (registry)
        patterns.push(registry);
    const facade = detectFacadePattern(changes, fromRef, toRef);
    if (facade)
        patterns.push(facade);
    const convention = detectConventionOverConfig(changes, fromRef, toRef);
    if (convention)
        patterns.push(convention);
    const deadCode = detectDeadCodeRemoval(changes);
    if (deadCode)
        patterns.push(deadCode);
    const testExpansion = detectTestExpansion(changes);
    if (testExpansion)
        patterns.push(testExpansion);
    const di = detectDependencyInjection(fromRef, toRef);
    if (di)
        patterns.push(di);
    const stabilitySprint = detectStabilitySprint(changes);
    if (stabilitySprint)
        patterns.push(stabilitySprint);
    return patterns.sort((a, b) => b.confidence - a.confidence);
}
function getFileChanges(fromRef, toRef) {
    try {
        const output = execSync(`git diff --numstat ${fromRef}..${toRef} --no-renames`, { encoding: "utf-8", stdio: "pipe", timeout: 5000 });
        return output
            .split("\n")
            .filter(Boolean)
            .map((line) => {
            const [ins, dels, filePath] = line.split("\t");
            if (!filePath)
                return null;
            const status = getChangeStatus(filePath, fromRef, toRef);
            const parts = filePath.split("/");
            return {
                path: filePath,
                status,
                insertions: parseInt(ins || "0", 10) || 0,
                deletions: parseInt(dels || "0", 10) || 0,
                dir: parts.length > 1 ? parts.slice(0, -1).join("/") : ".",
                basename: parts[parts.length - 1],
            };
        })
            .filter((c) => c !== null);
    }
    catch {
        return [];
    }
}
function getChangeStatus(filePath, fromRef, toRef) {
    try {
        const status = execSync(`git diff --name-status ${fromRef}..${toRef} -- ${filePath}`, { encoding: "utf-8", stdio: "pipe", timeout: 3000 }).trim();
        const statusChar = status.charAt(0);
        if (statusChar === "A" || statusChar === "M" || statusChar === "D" || statusChar === "R" || statusChar === "C") {
            return statusChar;
        }
        return "M";
    }
    catch {
        return "M";
    }
}
function detectExtractMethod(changes, _fromRef, _toRef) {
    const added = changes.filter((c) => c.status === "A" && c.path.endsWith(".ts"));
    const modified = changes.filter((c) => c.status === "M");
    if (added.length < 2)
        return null;
    const addedDirs = new Set(added.map((c) => c.dir));
    const modifiedDirs = new Set(modified.map((c) => c.dir));
    const sharedDirs = [...addedDirs].filter((d) => modifiedDirs.has(d));
    if (sharedDirs.length === 0)
        return null;
    const evidence = [];
    for (const dir of sharedDirs) {
        const addedInDir = added.filter((c) => c.dir === dir);
        const modInDir = modified.filter((c) => c.dir === dir);
        evidence.push(`${addedInDir.length} new files + ${modInDir.length} modified in ${dir}/`);
        for (const f of addedInDir.slice(0, 3)) {
            evidence.push(`  + ${f.basename}`);
        }
        for (const f of modInDir.slice(0, 3)) {
            evidence.push(`  ~ ${f.basename} (-${f.deletions} lines)`);
        }
    }
    const confidence = Math.min(0.95, 0.6 + added.length * 0.05 + sharedDirs.length * 0.1);
    return {
        name: "Extract Method",
        confidence,
        evidence,
        description: "Methods extracted from monolithic modules into dedicated files in the same directory. Classic decomposition pattern: one large file sheds responsibilities into focused modules.",
    };
}
function detectRegistryPattern(fromRef, toRef) {
    try {
        const diff = execSync(`git diff ${fromRef}..${toRef} --no-renames`, {
            encoding: "utf-8",
            stdio: "pipe",
            timeout: 8000,
        });
        const evidence = [];
        let switchRemovals = 0;
        let mapAdditions = 0;
        const switchLines = diff.split("\n");
        for (const line of switchLines) {
            if (line.startsWith("-") &&
                (line.includes("switch") || line.includes("case "))) {
                switchRemovals++;
            }
            if (line.startsWith("+") && line.includes("new Map")) {
                mapAdditions++;
            }
            if (line.startsWith("+") && line.includes(".set(")) {
                mapAdditions++;
            }
        }
        if (switchRemovals > 0 && mapAdditions > 0) {
            evidence.push(`Removed ${switchRemovals} switch/case lines, added ${mapAdditions} Map operations`);
        }
        else if (mapAdditions >= 2) {
            evidence.push(`${mapAdditions} Map operations added`);
        }
        else {
            return null;
        }
        const factoryPattern = diff.includes("registerProcessor") || diff.includes("register(");
        if (factoryPattern) {
            evidence.push("Factory/registry registration pattern detected");
        }
        return {
            name: "Registry Pattern",
            confidence: switchRemovals > 0 ? 0.9 : 0.7,
            evidence,
            description: "Switch statement replaced with Map-based registry lookup. O(1) dispatch replaces O(n) case matching. New entries require only registration, not code changes to the dispatcher.",
        };
    }
    catch {
        return null;
    }
}
function detectFacadePattern(changes, fromRef, toRef) {
    const modified = changes.filter((c) => c.status === "M" &&
        c.deletions > c.insertions * 2 &&
        c.deletions > 50);
    if (modified.length === 0)
        return null;
    const added = changes.filter((c) => c.status === "A" && c.path.endsWith(".ts"));
    if (added.length === 0)
        return null;
    try {
        const diff = execSync(`git diff ${fromRef}..${toRef} -- ${modified.map((c) => c.path).join(" ")} --no-renames`, { encoding: "utf-8", stdio: "pipe", timeout: 5000 });
        const removedFunctionLines = diff
            .split("\n")
            .filter((l) => l.startsWith("-") &&
            (l.includes("async ") || l.includes("function ") || l.includes("private "))).length;
        if (removedFunctionLines < 3)
            return null;
        const evidence = [];
        for (const f of modified) {
            evidence.push(`${f.path}: -${f.deletions}/+${f.insertions} lines, ${removedFunctionLines} function signatures removed`);
        }
        evidence.push(`${added.length} new files created to absorb extracted logic`);
        return {
            name: "Facade Pattern",
            confidence: 0.85,
            evidence,
            description: "Monolithic file stripped down to a thin facade while logic moves to dedicated modules. The original becomes a coordinator, not an implementer.",
        };
    }
    catch {
        return null;
    }
}
function detectConventionOverConfig(changes, fromRef, toRef) {
    const hasImplementations = changes.some((c) => c.status === "A" && c.path.includes("implementations/"));
    if (!hasImplementations)
        return null;
    try {
        const diff = execSync(`git diff ${fromRef}..${toRef} --no-renames`, {
            encoding: "utf-8",
            stdio: "pipe",
            timeout: 8000,
        });
        const hasDiscovery = diff.includes("discover") || diff.includes("auto-register") || diff.includes("scan");
        const hasReflection = diff.includes("reflect") || diff.includes("metadata");
        const hasDynamicImport = diff.includes("import(") || diff.includes("require(");
        if (!hasDiscovery && !hasDynamicImport)
            return null;
        const addedImpl = changes.filter((c) => c.status === "A" && c.path.includes("implementations/"));
        const evidence = [
            `${addedImpl.length} new implementations auto-discovered`,
        ];
        if (hasDiscovery)
            evidence.push("Discovery/scan logic present");
        if (hasDynamicImport)
            evidence.push("Dynamic imports for runtime loading");
        if (hasReflection)
            evidence.push("Reflection/metadata introspection");
        return {
            name: "Convention over Configuration",
            confidence: 0.88,
            evidence,
            description: "New modules are auto-discovered at runtime instead of manually registered. Drop a file in the right directory and the system finds it. Eliminates registration boilerplate and prevents orphaned modules.",
        };
    }
    catch {
        return null;
    }
}
function detectDeadCodeRemoval(changes) {
    const deleted = changes.filter((c) => c.status === "D");
    if (deleted.length < 2)
        return null;
    const evidence = [];
    for (const f of deleted.slice(0, 5)) {
        evidence.push(`- ${f.path}`);
    }
    if (deleted.length > 5) {
        evidence.push(`... and ${deleted.length - 5} more`);
    }
    return {
        name: "Dead Code Removal",
        confidence: 0.9,
        evidence,
        description: `${deleted.length} files deleted — unused code eliminated. Reduces maintenance burden, removes misleading signals for new readers.`,
    };
}
function detectTestExpansion(changes) {
    const addedTests = changes.filter((c) => c.status === "A" && c.path.includes("__tests__"));
    if (addedTests.length < 2)
        return null;
    const evidence = [];
    for (const f of addedTests.slice(0, 5)) {
        evidence.push(`+ ${f.path}`);
    }
    return {
        name: "Test Coverage Expansion",
        confidence: 0.95,
        evidence,
        description: `${addedTests.length} new test files added. Test-first or test-alongside development — covering new code as it ships.`,
    };
}
function detectDependencyInjection(fromRef, toRef) {
    try {
        const diff = execSync(`git diff ${fromRef}..${toRef} --no-renames`, {
            encoding: "utf-8",
            stdio: "pipe",
            timeout: 8000,
        });
        const evidence = [];
        const hasStaticDeps = diff.includes("+  static readonly dependencies") ||
            diff.includes("+  static dependencies");
        const hasInject = diff.includes("inject") || diff.includes("resolve(");
        const hasConstructorDI = diff.includes("constructor(") &&
            (diff.includes("private ") || diff.includes("readonly "));
        if (!hasStaticDeps && !hasInject)
            return null;
        if (hasStaticDeps)
            evidence.push("Static dependency declarations added");
        if (hasInject)
            evidence.push("DI container / injection logic");
        if (hasConstructorDI)
            evidence.push("Constructor-based DI signatures");
        return {
            name: "Dependency Injection",
            confidence: 0.82,
            evidence,
            description: "Explicit dependency declarations replacing hardcoded imports. Enables testing with mocks, runtime configuration, and auto-wiring.",
        };
    }
    catch {
        return null;
    }
}
function detectStabilitySprint(changes) {
    const fixChanges = changes.filter((c) => c.path.toLowerCase().includes("fix") ||
        c.path.toLowerCase().includes("patch"));
    const totalModified = changes.filter((c) => c.status === "M" || c.status === "A").length;
    const deleted = changes.filter((c) => c.status === "D");
    if (deleted.length < 3 && fixChanges.length < 3)
        return null;
    const netDeletions = changes.reduce((s, c) => s + c.deletions - c.insertions, 0);
    if (netDeletions < 100 && deleted.length < 3)
        return null;
    const evidence = [];
    if (deleted.length >= 3) {
        evidence.push(`${deleted.length} files deleted`);
    }
    if (netDeletions > 0) {
        evidence.push(`Net ${netDeletions} lines removed`);
    }
    if (fixChanges.length >= 3) {
        evidence.push(`${fixChanges.length} fix-related changes`);
    }
    return {
        name: "Stability Sprint",
        confidence: 0.75,
        evidence,
        description: "Focus on removal and fixing over feature addition. Technical debt being paid down — a sign of mature development practice.",
    };
}
//# sourceMappingURL=semantic-patterns.js.map