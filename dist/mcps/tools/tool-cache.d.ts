/**
 * Tool Cache
 *
 * Caches discovered tools to reduce network round-trips.
 * Part of Phase 4 refactoring - Tool Layer extraction.
 */
import { MCPTool } from '../types/index.js';
export interface ToolCacheOptions {
    ttlMs?: number;
    maxEntries?: number;
}
export declare class ToolCache {
    private cache;
    private readonly ttlMs;
    private readonly maxEntries;
    private accessOrder;
    constructor(options?: ToolCacheOptions);
    /**
     * Get cached tools for a server
     */
    get(serverName: string): MCPTool[] | null;
    /**
     * Cache tools for a server
     */
    set(serverName: string, tools: MCPTool[]): void;
    /**
     * Clear all cached entries
     */
    clear(): void;
    /**
     * Remove cached tools for a specific server
     */
    invalidate(serverName: string): boolean;
    /**
     * Check if tools are cached for a server
     */
    has(serverName: string): boolean;
    /**
     * Get all cached server names
     */
    getCachedServers(): string[];
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxEntries: number;
        ttlMs: number;
    };
    private updateAccessOrder;
    private removeFromAccessOrder;
    private evictOldest;
}
//# sourceMappingURL=tool-cache.d.ts.map