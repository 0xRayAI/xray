/**
 * Test Auto-Creation Processor
 *
 * Automatically generates test files when new source files are created.
 * Supports multiple languages: TypeScript, JavaScript, Python, Go, Rust, Java, C#
 * Uses direct skill calls (no MCP overhead) for instant test generation.
 *
 * @version 1.1.0
 * @since 2026-02-15
 */
export declare const testAutoCreationProcessor: {
    name: string;
    priority: number;
    enabled: boolean;
    execute(context: any): Promise<any>;
};
export default testAutoCreationProcessor;
//# sourceMappingURL=test-auto-creation-processor.d.ts.map