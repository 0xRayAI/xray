/**
 * Estimation MCP Server
 *
 * Provides tools for tracking and validating estimates
 */
/**
 * Estimation MCP Server
 * Tracks estimates vs actuals and provides calibrated predictions
 */
declare class EstimationServer {
    private server;
    private validator;
    constructor();
    private setupToolHandlers;
    private handleValidateEstimate;
    private handleStartTracking;
    private handleCompleteTracking;
    private handleGetReport;
    start(): Promise<void>;
}
export { EstimationServer };
//# sourceMappingURL=estimation.server.d.ts.map