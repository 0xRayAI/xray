/**
 * Simple command runner utility for executing shell commands
 */
import { exec, spawn } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
/**
 * Run a shell command and return the result
 */
export async function runCommand(command, options = {}) {
    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd: options.cwd || process.cwd(),
            env: { ...process.env, ...options.env },
            timeout: options.timeout || 30000, // 30 second default timeout
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        });
        return {
            success: true,
            stdout: stdout.toString().trim(),
            stderr: stderr.toString().trim(),
            exitCode: 0,
        };
    }
    catch (error) {
        return {
            success: false,
            stdout: error.stdout?.toString().trim() || "",
            stderr: error.stderr?.toString().trim() || error.message || "Command failed",
            exitCode: error.code || 1,
        };
    }
}
/**
 * Run a command and throw on failure
 */
export async function runCommandStrict(command, options = {}) {
    const result = await runCommand(command, options);
    if (!result.success) {
        throw new Error(`Command failed: ${command}\n${result.stderr}`);
    }
    return result.stdout;
}
/**
 * Run a command safely using spawn with an args array (no shell interpretation).
 * This prevents command injection when args may contain user-controlled input.
 */
export async function runCommandSafe(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            cwd: options.cwd || process.cwd(),
            env: { ...process.env, ...options.env },
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        const timeout = options.timeout || 30000;
        const timer = setTimeout(() => {
            child.kill("SIGTERM");
        }, timeout);
        child.stdout.on("data", (data) => {
            stdout += data.toString();
        });
        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({
                success: code === 0,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: code ?? 1,
            });
        });
        child.on("error", (err) => {
            clearTimeout(timer);
            resolve({
                success: false,
                stdout: "",
                stderr: err.message,
                exitCode: 1,
            });
        });
    });
}
/**
 * Run a safe command and throw on failure
 */
export async function runCommandSafeStrict(command, args, options = {}) {
    const result = await runCommandSafe(command, args, options);
    if (!result.success) {
        throw new Error(`Command failed: ${command} ${args.join(" ")}\n${result.stderr}`);
    }
    return result.stdout;
}
//# sourceMappingURL=command-runner.js.map