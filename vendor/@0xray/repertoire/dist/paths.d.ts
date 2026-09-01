/** Compiled to dist/paths.js — one level below package root. */
export declare const PACKAGE_ROOT: string;
export declare const DEFAULT_DATA_DIR: string;
export declare const DEFAULT_SIGNALS_PATH: string;
export declare const DEFAULT_STATE_PATH: string;
export declare const DEFAULT_LOG_DIR: string;
export declare const DEFAULT_FEEDBACK_DIR: string;
export declare const DEFAULT_MCP_SERVER_PATH: string;
export declare const DEFAULT_PROVIDER_PATH: string;
export declare function defaultProjectStateDir(cwd?: string): string;
export declare function isRepertoirePackageCwd(cwd: string): boolean;
export declare function isImmutablePackagePath(filePath: string): boolean;
/** Signals seed is readable; missing consumer path may fall back to the package file. */
export declare function resolveReadableConfigPath(configured: string | undefined, cwd: string, packageDefault: string): string;
/** State/feedback paths must not silently fall back into the package. */
export declare function resolveWritableConfigPath(configured: string | undefined, cwd: string, fallback: string): string;
/**
 * Package seed stays read-only. Consumer cwd hydrates `.xray/state/repertoire/curated_signals.json`.
 * Running inside this repo keeps the seed path (tests + organ development).
 */
export declare function hydrateWritableSignals(seedPath: string, cwd?: string): string;
/** @deprecated use resolveReadableConfigPath */
export declare const resolveProviderConfigPath: typeof resolveReadableConfigPath;
//# sourceMappingURL=paths.d.ts.map