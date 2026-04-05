/**
 * Language Detector Utility
 *
 * Detects project language and test framework from project files.
 * Supports: TypeScript, JavaScript, Python, Go, Rust, Java, C++, Ruby, PHP
 *
 * @version 1.0.0
 * @since 2026-02-25
 */
export interface ProjectLanguage {
    language: string;
    testFramework: string;
    testCommand: string;
    testFilePattern: string;
    configFiles: string[];
}
export interface LanguageConfig {
    language: string;
    extensions: string[];
    testFrameworks: {
        name: string;
        patterns: string[];
        testCommands: string[];
        configFiles: string[];
    }[];
}
export declare const LANGUAGE_CONFIGS: LanguageConfig[];
/**
 * Detect the project language from directory contents
 */
export declare function detectProjectLanguage(cwd: string): ProjectLanguage | null;
/**
 * Get the test file path for a given source file
 */
export declare function getTestFilePath(sourceFilePath: string, projectLanguage: ProjectLanguage): string;
/**
 * Build the test command for running specific tests
 */
export declare function buildTestCommand(projectLanguage: ProjectLanguage, testFilePath?: string): string;
export declare const languageDetector: {
    detect: typeof detectProjectLanguage;
    getTestFilePath: typeof getTestFilePath;
    buildTestCommand: typeof buildTestCommand;
};
//# sourceMappingURL=language-detector.d.ts.map