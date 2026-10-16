/** Compiled to dist/paths.js — one level below package root. */
export declare const PACKAGE_ROOT: string;
export declare const DEFAULT_DATA_DIR: string;
export declare const DEFAULT_SIGNALS_PATH: string;
export declare const DEFAULT_STACK_OVERLAY_PATH: string;
export declare const DEFAULT_SUBJECT_OVERLAY_PATH: string;
export declare const DEFAULT_STATE_PATH: string;
export declare const DEFAULT_LOG_DIR: string;
export declare const DEFAULT_FEEDBACK_DIR: string;
export declare const DEFAULT_MCP_SERVER_PATH: string;
export declare const DEFAULT_PROVIDER_PATH: string;
export declare function defaultProjectStateDir(cwd?: string): string;
/** Writable organ paths — always project-local, including when cwd is this repo. */
export declare function defaultWritablePaths(cwd?: string): {
    dataDir: string;
    signalsPath: string;
    statePath: string;
    logDir: string;
    feedbackDir: string;
};
export declare function isRepertoirePackageCwd(cwd: string): boolean;
export declare function isImmutablePackagePath(filePath: string): boolean;
/** Tarball registry only — not project-local `.xray/state/repertoire/` even inside this repo. */
export declare function isFactorySeedFile(filePath: string): boolean;
/** Signals seed is readable; missing consumer path may fall back to the package file. */
export declare function resolveReadableConfigPath(configured: string | undefined, cwd: string, packageDefault: string): string;
/** State/feedback paths must not silently fall back into the package. */
export declare function resolveWritableConfigPath(configured: string | undefined, cwd: string, fallback: string): string;
export declare function isGenericFieldObservedDefinition(definition: string): boolean;
/**
 * Merge `data/stack-overlay.json` into a project copy.
 * Missing names are appended. A changed stack law field is refreshed.
 * Observation stats on existing names stay. Refuses the factory tarball path.
 */
export declare function mergeStackOverlay(destPath: string, overlayPath?: string): number;
/**
 * Additive merge of `data/subject-overlay.json` — product/repo flesh.
 * Missing names are appended. Generic field-observed stubs get overlay flesh.
 * Existing subject definitions and observation stats stay. Not OP-PROC.
 */
export declare function mergeSubjectOverlay(destPath: string, overlayPath?: string): number;
/**
 * Explicit field JSONL producers. Groover is not Repertoire — do not walk
 * sibling `../groover/` or `research/groover-inference-logs*` by default.
 * `REPERTOIRE_FIELD_LOGS` is a colon-separated list of dirs.
 */
export declare function discoverFieldLogDirs(_cwd?: string): string[];
/** Tests stay isolated. CLI / wear syncs when sibling field logs exist. */
export declare function shouldAutoSyncField(explicit?: boolean): boolean;
/**
 * 0xRay session-capture dirs. Groover field JSONL is not a source.
 * `REPERTOIRE_XRAY_LOGS` is a colon-separated list. Also walks this project
 * and sibling `docs/inference` / `.xray/inference` when they hold session-*.json.
 */
export declare function discoverXrayKernelDirs(cwd?: string): string[];
export declare function shouldAutoSyncXray(explicit?: boolean): boolean;
export interface SiblingRepo {
    root: string;
    name: string;
    description: string;
    primitive: string;
}
/** Sibling package.json map. Hangars stay hangars — we remember them, we do not suit them. */
export declare function discoverSiblingRepos(cwd?: string): SiblingRepo[];
export interface OpProcReload {
    dest: string;
    names: string[];
    count: number;
}
/**
 * Factory + stack overlay names on the project dest. This is OP-PROC.
 * Subject repo names are dest memory, not OP-PROC. Not Station.
 */
export declare function reloadOpProc(cwd?: string): OpProcReload;
export declare function hydrateWritableSignals(seedPath: string, cwd?: string): string;
export interface KernelDiaryCollect {
    text: string;
    sources: string[];
}
/**
 * Kernel processing diary text. Heat existing dest names only.
 * Does not walk Groover experiment dirs. Does not propose colon pattern ids.
 */
export declare function collectKernelDiaryText(cwd?: string): KernelDiaryCollect;
/** @deprecated use resolveReadableConfigPath */
export declare const resolveProviderConfigPath: typeof resolveReadableConfigPath;
//# sourceMappingURL=paths.d.ts.map