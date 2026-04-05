/**
 * Graceful Shutdown Handler
 *
 * Centralized shutdown handling for MCP servers.
 * Extracts common shutdown patterns to reduce code duplication.
 *
 * @version 1.0.0
 * @since 2026-03-22
 */
export interface ShutdownOptions {
    serverName: string;
    server: {
        close: () => Promise<void>;
    } | null;
    shutdownTimeout?: number;
}
export interface ShutdownHandler {
    cleanup: (signal: string) => Promise<void>;
    stop: () => void;
}
/**
 * Creates a graceful shutdown handler for MCP servers
 *
 * @param options - Configuration for the shutdown handler
 * @returns ShutdownHandler with cleanup and stop methods
 */
export declare function createGracefulShutdown(options: ShutdownOptions): ShutdownHandler;
//# sourceMappingURL=shutdown-handler.d.ts.map