/**
 * StrRay Librarian MCP Server
 *
 * Knowledge skill for codebase documentation lookup, implementation examples,
 * and multi-repo analysis - serves as the universal documentation reference
 *
 * NOTE: Class is named StrRayLibrarianServer but the MCP server name is
 * "researcher" for backwards compatibility with existing tool references.
 */
declare class StrRayLibrarianServer {
    private server;
    constructor();
    private setupToolHandlers;
    private searchCodebase;
    private findImplementation;
    private getDocumentation;
    run(): Promise<void>;
}
export { StrRayLibrarianServer };
//# sourceMappingURL=researcher.server.d.ts.map