/**
 * Codex Formatter — Standalone Codex-to-Prompt Converter
 *
 * Converts StringRay's Universal Development Codex terms into
 * formatted system prompt text. No OpenCode dependency, no plugin
 * API, no framework imports. Pure input/output.
 *
 * This is the decoupled replacement for the codex injection that
 * previously lived inside the OpenCode plugin (strray-codex-injection.ts).
 *
 * Usage from any host (Node.js, Python via bridge, HTTP, etc.):
 *   import { formatCodexPrompt } from './codex-formatter.js';
 *   const prompt = formatCodexPrompt({ projectRoot: '/path' });
 *   // Append to system prompt
 *
 * @version 1.0.0
 * @since 2026-03-28
 */
export interface CodexTerm {
    id: string;
    title: string;
    description: string;
    severity: "blocking" | "high" | "medium";
    examples?: string[];
}
export interface CodexConfig {
    version: string;
    terms: CodexTerm[];
    categories?: Record<string, string[]>;
}
export interface FormatOptions {
    /** Project root for config resolution (default: cwd) */
    projectRoot?: string;
    /** Include only terms matching these severity levels (default: all) */
    severityFilter?: Array<"blocking" | "high" | "medium">;
    /** Include examples for each term (default: false) */
    includeExamples?: boolean;
    /** Maximum number of terms to include (default: all) */
    maxTerms?: number;
    /** Custom header text (default: auto-generated) */
    header?: string;
    /** Include config path reference in footer (default: true) */
    includeConfigPath?: boolean;
    /** Compress output by omitting descriptions for medium-severity terms */
    compressed?: boolean;
}
export interface FormatResult {
    /** The formatted prompt text */
    prompt: string;
    /** Number of terms included */
    termCount: number;
    /** Total terms available */
    totalTerms: number;
    /** Codex version */
    version: string;
    /** Config source path (or null if using built-in fallback) */
    configPath: string | null;
    /** Approximate character count */
    charCount: number;
}
export declare const BUILTIN_CODEX: CodexConfig;
/**
 * Find codex.json using the standard priority chain.
 * Mirrors config-paths.ts resolveCodexPath() but returns first match.
 */
export declare function findCodexPath(projectRoot?: string): string | null;
/**
 * Load and parse codex.json. Falls back to built-in codex if not found.
 */
export declare function loadCodex(projectRoot?: string): {
    config: CodexConfig;
    source: string | null;
};
/**
 * Format codex terms into a system-prompt-ready string.
 *
 * This is the primary export. Any host (OpenCode, Hermes, Claude Desktop,
 * custom agent) can call this to get enforcement text for their system prompt.
 */
export declare function formatCodexPrompt(options?: FormatOptions): FormatResult;
/**
 * Get codex as a structured JSON object (for programmatic consumers).
 */
export declare function getCodexConfig(options?: {
    projectRoot?: string;
}): {
    version: string;
    terms: CodexTerm[];
    termCount: number;
    source: string | null;
};
/**
 * Get a minimal codex prompt for token-constrained environments.
 * Only includes blocking terms, no descriptions.
 */
export declare function formatMinimalCodexPrompt(options?: FormatOptions): FormatResult;
//# sourceMappingURL=codex-formatter.d.ts.map