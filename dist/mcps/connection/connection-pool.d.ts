import { IMcpConnection, IServerConfig } from '../types/index.js';
/**
 * Connection Pool Interface
 * Defines the contract for connection pool implementations
 */
export interface IConnectionPoolExtended {
    acquire(serverName: string, config: IServerConfig): Promise<IMcpConnection>;
    release(connection: IMcpConnection): void;
    clear(): Promise<void>;
}
/**
 * Connection Pool
 * Manages a pool of reusable MCP connections per server
 */
export declare class ConnectionPool implements IConnectionPoolExtended {
    private pools;
    private maxPoolSize;
    private maxIdleTimeMs;
    constructor(options?: {
        maxPoolSize?: number;
        maxIdleTimeMs?: number;
    });
    /**
     * Acquire a connection from the pool or create a new one
     * @param serverName - Name of the server
     * @param config - Server configuration (used when creating new connections)
     * @returns Promise resolving to an MCP connection
     */
    acquire(serverName: string, config: IServerConfig): Promise<IMcpConnection>;
    /**
     * Release a connection back to the pool
     * @param connection - The connection to release
     */
    release(connection: IMcpConnection): void;
    /**
     * Clear all connections in the pool
     */
    clear(): Promise<void>;
    /**
     * Get pool statistics
     * @returns Object with pool statistics
     */
    getStats(): {
        totalServers: number;
        totalConnections: number;
        activeConnections: number;
        idleConnections: number;
    };
    /**
     * Get pool statistics for a specific server
     * @param serverName - Name of the server
     * @returns Pool statistics or null if server not in pool
     */
    getServerStats(serverName: string): {
        total: number;
        active: number;
        idle: number;
    } | null;
    /**
     * Clean up stale (idle for too long) connections from a pool
     */
    private cleanupStaleConnections;
}
//# sourceMappingURL=connection-pool.d.ts.map