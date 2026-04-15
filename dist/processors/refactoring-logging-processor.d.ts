export interface RefactoringContext {
    agentName: string;
    task: {
        id?: string;
        description?: string;
        operationType?: string;
    };
    startTime: number;
    complexityScore?: number;
    changes?: Array<{
        description?: string;
        type?: string;
    }>;
    files?: string[];
    metrics?: Record<string, unknown>;
    operationType?: string;
}
export interface RefactoringLogResult {
    logged: boolean;
    success: boolean;
    message: string;
    error?: string;
}
export declare class RefactoringLoggingProcessor {
    private logPath;
    constructor();
    private ensureLogDirectory;
    execute(context: RefactoringContext): Promise<RefactoringLogResult>;
    private createLogEntry;
    private appendToLog;
}
//# sourceMappingURL=refactoring-logging-processor.d.ts.map