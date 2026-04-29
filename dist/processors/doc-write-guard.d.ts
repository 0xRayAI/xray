export declare class DocWriteGuard {
    static append(filePath: string, content: string): Promise<void>;
    static createIfMissing(filePath: string, content: string): Promise<void>;
    static isDocFile(filePath: string): boolean;
    static isDocPath(filePath: string): boolean;
}
//# sourceMappingURL=doc-write-guard.d.ts.map