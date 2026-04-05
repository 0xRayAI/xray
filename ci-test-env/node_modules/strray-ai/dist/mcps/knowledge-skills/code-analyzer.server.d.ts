/**
 * Code Analyzer MCP Server - CONSOLIDATED
 *
 * Comprehensive code analysis combining:
 * - Original code-analyzer (metrics, complexity, smells)
 * - explore (file search, patterns, dependencies)
 * - analyzer (pattern detection)
 *
 * This is the SINGLE source for code-level analysis.
 * Use project-analysis for project-level (structure, health).
 */
declare class CodeAnalyzerServer {
    private server;
    private tools;
    constructor();
    private handleAnalyzeCode;
    private calculateCodeMetrics;
    private calculateCyclomaticComplexity;
    private handleCalculateComplexity;
    private handleDetectCodeSmells;
    private handleExtractMetrics;
    private handleExploreCodebase;
    private matchesPattern;
    private handleFindPatterns;
    private handleFindFunction;
    private handleGetFileStructure;
    private handleAnalyzeDependencies;
    private handleFindDuplicates;
    run(): Promise<void>;
}
export default CodeAnalyzerServer;
//# sourceMappingURL=code-analyzer.server.d.ts.map