/**
 * Config Path Resolver
 *
 * Centralizes all StringRay config file path resolution.
 * Supports STRRAY_CONFIG_DIR env var for custom config roots,
 * making .opencode/ completely optional for environments like Hermes Agent.
 *
 * Resolution order (per file type):
 *   1. STRRAY_CONFIG_DIR/<relative_path>     (if env var set)
 *   2. .strray/<relative_path>                (preferred lightweight root)
 *   3. .opencode/strray/<relative_path>       (legacy OpenCode root)
 *   4. null                                   (callers fall back to built-in defaults)
 *
 * For state/data directories, uses:
 *   1. STRRAY_CONFIG_DIR/state                 (if env var set)
 *   2. .strray/state
 *   3. .opencode/state                         (legacy)
 *   4. .strray/state                           (default — always writable)
 */
/** Environment variable name for custom config root */
export declare const STRRAY_CONFIG_DIR_ENV = "STRRAY_CONFIG_DIR";
/**
 * Detect the best available config directory.
 * Scans in priority order and caches the first one that exists (or the first default).
 */
export declare function getConfigDir(projectRoot?: string): string;
/**
 * Resolve a specific config file path using the standard priority chain.
 * Returns null if no suitable path is found (caller should use defaults).
 *
 * @param relativePath - Path relative to config dir (e.g., "features.json")
 * @param projectRoot  - Optional project root override
 */
export declare function resolveConfigPath(relativePath: string, projectRoot?: string): string | null;
/**
 * Get the state persistence directory (the parent directory for state.json).
 * Similar logic to resolveConfigPath but for the state/ subdirectory.
 */
export declare function resolveStateDir(projectRoot?: string): string;
/**
 * Get the state persistence FILE path (e.g. .opencode/state/state.json).
 * Prefer this over resolveStateDir when you need a file path for fs.writeFileSync.
 */
export declare function resolveStateFilePath(projectRoot?: string): string;
/**
 * Get the profiles storage directory.
 */
export declare function resolveProfilesDir(projectRoot?: string): string;
/**
 * Resolve codex.json path.
 * Has additional fallback locations beyond the standard config dir.
 */
export declare function resolveCodexPath(projectRoot?: string): string[];
/**
 * Get the logs directory for framework logging.
 */
export declare function resolveLogDir(projectRoot?: string): string;
/**
 * Reset the cached config dir (useful for testing).
 */
export declare function resetConfigDirCache(): void;
//# sourceMappingURL=config-paths.d.ts.map