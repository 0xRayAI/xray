import { IMcpConnection, IServerConfig } from '../types/index.js';
/**
 * Connection Manager
 * Manages MCP connection lifecycle and provides centralized access to connections
 */
export declare class ConnectionManager {
    private connections;
    /**
     * Get or create a connection for a server
     * @param config - Server configuration
     * @returns Promise resolving to an MCP connection
     */
    getConnection(config: IServerConfig): Promise<IMcpConnection>;
    /**
     * Disconnect a specific server
     * @param serverName - Name of the server to disconnect
     */
    disconnect(serverName: string): Promise<void>;
    /**
     * Disconnect all managed connections
     */
    disconnectAll(): Promise<void>;
    /**
     * Check if a connection exists for a server
     * @param serverName - Name of the server
     * @returns True if connection exists and is connected
     */
    hasConnection(serverName: string): boolean;
    /**
     * Get all connected server names
     * @returns Array of server names
     */
    getConnectedServers(): string[];
    /**
     * Get the number of active connections
     * @returns Number of connections
     */
    getConnectionCount(): number;
}
//# sourceMappingURL=connection-manager.d.ts.map