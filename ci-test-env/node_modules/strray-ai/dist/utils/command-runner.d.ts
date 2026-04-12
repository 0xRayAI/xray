/**
 * Simple command runner utility for executing shell commands
 */
export interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
}
export interface CommandOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
    silent?: boolean;
}
/**
 * Run a shell command and return the result
 */
export declare function runCommand(command: string, options?: CommandOptions): Promise<CommandResult>;
/**
 * Run a command and throw on failure
 */
export declare function runCommandStrict(command: string, options?: CommandOptions): Promise<string>;
/**
 * Run a command safely using spawn with an args array (no shell interpretation).
 * This prevents command injection when args may contain user-controlled input.
 */
export declare function runCommandSafe(command: string, args: string[], options?: CommandOptions): Promise<CommandResult>;
/**
 * Run a safe command and throw on failure
 */
export declare function runCommandSafeStrict(command: string, args: string[], options?: CommandOptions): Promise<string>;
//# sourceMappingURL=command-runner.d.ts.map