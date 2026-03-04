import { spawn, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { getBatchOperations } from "../core/features-config.js";

export interface ReplacementOperation {
  pattern: string;
  replacement: string;
  isRegex?: boolean;
  caseSensitive?: boolean;
}

export interface BatchResult {
  success: boolean;
  filesModified: number;
  errors: Array<{ file: string; error: string }>;
  duration: number;
}

/**
 * Validate operation is safe for command execution
 * Prevents command injection by validating patterns and replacements
 */
function validateSafeString(
  str: string,
  operationType: string,
): boolean {
  // Allow only alphanumeric, basic regex characters, and whitespace
  // SECURITY: Blocks shell metacharacters that could enable command injection
  const safePattern = /^[a-zA-Z0-9\s\-_.@\\{}()*+?^$.|<>]+$/;
  const isSafe = safePattern.test(str) && str.length <= 200;

  if (!isSafe) {
    const errorMsg = operationType
      ? `Invalid ${operationType} operation: ${str}`
      : `Invalid operation: ${str}`;
    throw new Error(errorMsg);
  }

  return isSafe;
}

/**
 * Validate operation type and pattern/replacement strings
 */
function validateOperation(op: FileOperation | ReplacementOperation): void {
  // For FileOperation, validate the operation type
  if ("operation" in op) {
    const allowedOperations = ["replace", "append", "prepend", "delete"];
    if (!allowedOperations.includes(op.operation)) {
      throw new Error(`Invalid operation type: ${op.operation}`);
    }
  }

  // For ReplacementOperation, validate pattern/replacement strings
  if ("pattern" in op) {
    // Validate pattern string for command injection prevention
    if (op.pattern) {
      validateSafeString(op.pattern, 'pattern');
    }

    // Validate replacement string if it exists (ReplacementOperation only)
    if ("replacement" in op && op.replacement) {
      validateSafeString(op.replacement, 'replacement');
    }
  }

  // Validate content if it exists (FileOperation only)
  if ("content" in op && op.content) {
    validateSafeString(op.content, 'content');
  }
}

export interface FileOperation {
  filePath: string;
  operation: "replace" | "append" | "prepend" | "delete";
  content?: string;
  pattern?: string;
}

function escapeForSed(str: string): string {
  return str.replace(/[\/&]/g, "\\$&");
}

function escapeForGrep(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function batchReplace(
  files: string[],
  operations: ReplacementOperation[],
): Promise<BatchResult> {
  const startTime = Date.now();
  const config = getBatchOperations();

  if (!config.enabled) {
    return executeSequential(files, operations, startTime);
  }

  const firstOperation = operations[0];
  if (
    config.prefer_sed_for_replacements &&
    operations.length === 1 &&
    firstOperation
  ) {
    return executeSedBatch(files, firstOperation, startTime);
  }

  if (
    config.parallel_file_updates &&
    files.length > config.auto_batch_threshold
  ) {
    return executeParallelBatch(
      files,
      operations,
      config.max_concurrent_edits,
      startTime,
    );
  }

  return executeSequential(files, operations, startTime);
}

/**
 * Execute sed command using spawn to prevent command injection
 * SECURITY: Uses array arguments to prevent shell injection attacks
 */
async function executeSedBatch(
  files: string[],
  operation: ReplacementOperation,
  startTime: number,
): Promise<BatchResult> {
  const errors: Array<{ file: string; error: string }> = [];
  let filesModified = 0;

  const pattern = operation.isRegex
    ? operation.pattern
    : escapeForGrep(operation.pattern);
  const replacement = escapeForSed(operation.replacement);
  const sedFlags = operation.caseSensitive ? "g" : "gi";

  for (const file of files) {
    try {
      if (!fs.existsSync(file)) {
        errors.push({ file, error: "File not found" });
        continue;
      }

      // SECURITY FIX: Use spawn with array arguments to prevent command injection
      // This avoids shell interpretation and injection attacks
      const args = ["-i", "", `s/${pattern}/${replacement}/${sedFlags}`, file];
      await new Promise<void>((resolve, reject) => {
        const sedProcess = spawn("sed", args);

        let stderr = "";
        sedProcess.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        sedProcess.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`sed failed with code ${code}: ${stderr}`));
          }
        });

        sedProcess.on("error", (err) => {
          reject(new Error(`Failed to spawn sed: ${err.message}`));
        });
      });

      filesModified++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push({ file, error: errorMessage });
    }
  }

  return {
    success: errors.length === 0,
    filesModified,
    errors,
    duration: Date.now() - startTime,
  };
}

async function executeParallelBatch(
  files: string[],
  operations: ReplacementOperation[],
  maxConcurrent: number,
  startTime: number,
): Promise<BatchResult> {
  const errors: Array<{ file: string; error: string }> = [];
  let filesModified = 0;

  const chunks: string[][] = [];
  for (let i = 0; i < files.length; i += maxConcurrent) {
    chunks.push(files.slice(i, i + maxConcurrent));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (file) => {
      try {
        await processFileOperations(file, operations);
        return { file, success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { file, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(promises);
    for (const result of results) {
      if (result.success) {
        filesModified++;
      } else if (result.error) {
        errors.push({ file: result.file, error: result.error });
      }
    }
  }

  return {
    success: errors.length === 0,
    filesModified,
    errors,
    duration: Date.now() - startTime,
  };
}

async function executeSequential(
  files: string[],
  operations: ReplacementOperation[],
  startTime: number,
): Promise<BatchResult> {
  const errors: Array<{ file: string; error: string }> = [];
  let filesModified = 0;

  for (const file of files) {
    try {
      await processFileOperations(file, operations);
      filesModified++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push({ file, error: errorMessage });
    }
  }

  return {
    success: errors.length === 0,
    filesModified,
    errors,
    duration: Date.now() - startTime,
  };
}

async function processFileOperations(
  filePath: string,
  operations: ReplacementOperation[],
): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  for (const op of operations) {
    const flags = op.caseSensitive ? "g" : "gi";
    const regex = op.isRegex
      ? new RegExp(op.pattern, flags)
      : new RegExp(escapeForGrep(op.pattern), flags);

    if (regex.test(content)) {
      content = content.replace(regex, op.replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
  }
}

export async function batchFileOperations(
  operations: FileOperation[],
): Promise<BatchResult> {
  const startTime = Date.now();
  const errors: Array<{ file: string; error: string }> = [];
  let filesModified = 0;

  for (const op of operations) {
    try {
      switch (op.operation) {
        case "replace":
          if (op.pattern && op.content) {
            await processFileOperations(op.filePath, [
              { pattern: op.pattern, replacement: op.content },
            ]);
          }
          break;

        case "append":
          if (op.content) {
            const existing = fs.existsSync(op.filePath)
              ? fs.readFileSync(op.filePath, "utf-8")
              : "";
            fs.writeFileSync(op.filePath, existing + op.content, "utf-8");
          }
          break;

        case "prepend":
          if (op.content) {
            const existing = fs.existsSync(op.filePath)
              ? fs.readFileSync(op.filePath, "utf-8")
              : "";
            fs.writeFileSync(op.filePath, op.content + existing, "utf-8");
          }
          break;

        case "delete":
          if (fs.existsSync(op.filePath)) {
            fs.unlinkSync(op.filePath);
          }
          break;
      }
      filesModified++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push({ file: op.filePath, error: errorMessage });
    }
  }

  return {
    success: errors.length === 0,
    filesModified,
    errors,
    duration: Date.now() - startTime,
  };
}

export function findFilesWithPattern(
  directory: string,
  pattern: string,
  extensions: string[] = [".ts", ".tsx", ".js", ".jsx", ".json"],
): string[] {
  const results: string[] = [];

  function searchDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }

      if (entry.isDirectory()) {
        searchDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            if (content.includes(pattern)) {
              results.push(fullPath);
            }
          } catch {
            continue;
          }
        }
      }
    }
  }

  searchDir(directory);
  return results;
}

export async function bulkRename(
  directory: string,
  oldName: string,
  newName: string,
  extensions: string[] = [".ts", ".tsx", ".js", ".jsx"],
): Promise<BatchResult> {
  const files = findFilesWithPattern(directory, oldName, extensions);

  return batchReplace(files, [
    {
      pattern: oldName,
      replacement: newName,
      isRegex: false,
      caseSensitive: true,
    },
  ]);
}
