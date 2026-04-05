/**
 * Session Management MCP Server
 *
 * Tools for managing user sessions and persistent state.
 * Provides session lifecycle management, state persistence, and cleanup utilities.
 */
declare class SessionManagementServer {
    private server;
    private sessions;
    private tools;
    constructor();
    private generateSessionId;
    private isExpired;
    private handleCreateSession;
    private handleGetSession;
    private handleUpdateSession;
    private handleDeleteSession;
    private handleListSessions;
    private handleSessionExists;
    private handleCleanupExpiredSessions;
    run(): Promise<void>;
}
export default SessionManagementServer;
//# sourceMappingURL=session-management.server.d.ts.map