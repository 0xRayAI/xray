declare class FrameworkHelpServer {
    private server;
    constructor();
    private setupToolHandlers;
    private handleGetCapabilities;
    private handleGetCommands;
    private handleExplainCapability;
    private generateCommandList;
    private generateFullCapabilities;
    private generateCategoryCapabilities;
    start(): Promise<void>;
}
export { FrameworkHelpServer };
//# sourceMappingURL=framework-help.server.d.ts.map