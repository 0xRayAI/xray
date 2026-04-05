export interface ReplacementOperation {
    pattern: string;
    replacement: string;
    isRegex?: boolean;
    caseSensitive?: boolean;
}
export interface BatchResult {
    success: boolean;
    filesModified: number;
    errors: Array<{
        file: string;
        error: string;
    }>;
    duration: number;
}
export interface FileOperation {
    filePath: string;
    operation: "replace" | "append" | "prepend" | "delete";
    content?: string;
    pattern?: string;
}
export declare function batchReplace(files: string[], operations: ReplacementOperation[]): Promise<BatchResult>;
export declare function batchFileOperations(operations: FileOperation[]): Promise<BatchResult>;
export declare function findFilesWithPattern(directory: string, pattern: string, extensions?: string[]): string[];
export declare function bulkRename(directory: string, oldName: string, newName: string, extensions?: string[]): Promise<BatchResult>;
//# sourceMappingURL=batch-operations.d.ts.map