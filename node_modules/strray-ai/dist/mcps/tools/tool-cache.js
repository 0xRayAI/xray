/**
 * Tool Cache
 *
 * Caches discovered tools to reduce network round-trips.
 * Part of Phase 4 refactoring - Tool Layer extraction.
 */
export class ToolCache {
    cache = new Map();
    ttlMs;
    maxEntries;
    accessOrder = [];
    constructor(options = {}) {
        this.ttlMs = options.ttlMs ?? 300000; // 5 minutes default
        this.maxEntries = options.maxEntries ?? 100;
    }
    /**
     * Get cached tools for a server
     */
    get(serverName) {
        const entry = this.cache.get(serverName);
        if (!entry) {
            return null;
        }
        // Check if entry is expired
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(serverName);
            this.removeFromAccessOrder(serverName);
            return null;
        }
        // Update access order for LRU
        this.updateAccessOrder(serverName);
        return entry.tools;
    }
    /**
     * Cache tools for a server
     */
    set(serverName, tools) {
        // Evict oldest entry if at capacity
        if (this.cache.size >= this.maxEntries && !this.cache.has(serverName)) {
            this.evictOldest();
        }
        this.cache.set(serverName, {
            tools,
            timestamp: Date.now(),
        });
        this.updateAccessOrder(serverName);
    }
    /**
     * Clear all cached entries
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }
    /**
     * Remove cached tools for a specific server
     */
    invalidate(serverName) {
        this.removeFromAccessOrder(serverName);
        return this.cache.delete(serverName);
    }
    /**
     * Check if tools are cached for a server
     */
    has(serverName) {
        const entry = this.cache.get(serverName);
        if (!entry) {
            return false;
        }
        // Check if entry is expired
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(serverName);
            this.removeFromAccessOrder(serverName);
            return false;
        }
        return true;
    }
    /**
     * Get all cached server names
     */
    getCachedServers() {
        return Array.from(this.cache.keys()).filter((server) => this.has(server));
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxEntries: this.maxEntries,
            ttlMs: this.ttlMs,
        };
    }
    updateAccessOrder(serverName) {
        this.removeFromAccessOrder(serverName);
        this.accessOrder.push(serverName);
    }
    removeFromAccessOrder(serverName) {
        const index = this.accessOrder.indexOf(serverName);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
    }
    evictOldest() {
        if (this.accessOrder.length > 0) {
            const oldest = this.accessOrder.shift();
            if (oldest) {
                this.cache.delete(oldest);
            }
        }
    }
}
//# sourceMappingURL=tool-cache.js.map