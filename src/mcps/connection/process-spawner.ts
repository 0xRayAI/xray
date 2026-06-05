import { spawn, ChildProcess } from 'child_process';
import { IServerConfig } from '../types/index.js';

/**
 * Spawn Result
 * Contains the spawned process and its stdio streams
 */
export interface SpawnResult {
  process: ChildProcess;
  stdout: NodeJS.ReadableStream;
  stdin: NodeJS.WritableStream;
  stderr: NodeJS.ReadableStream;
}

/**
 * Process Spawner
 * Handles spawning of MCP server processes
 */
export class ProcessSpawner {
  /**
   * Spawn a new process with the given configuration
   * @param config - Server configuration containing command, args, env, and basePath
   * @returns SpawnResult with process and stdio streams
   */
  spawn(config: IServerConfig): SpawnResult {
    const ALLOWED_ENV_KEYS = new Set([
      'PATH', 'HOME', 'NODE_PATH', 'TMPDIR', 'TEMP', 'TMP',
      'LANG', 'LC_ALL',
    ]);
    const safeEnv: Record<string, string> = {};
    for (const key of ALLOWED_ENV_KEYS) {
      if (process.env[key]) safeEnv[key] = process.env[key]!;
    }
    const proc = spawn(config.command, config.args, {
      env: { ...safeEnv, ...config.env },
      cwd: config.basePath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      process: proc,
      stdout: proc.stdout,
      stdin: proc.stdin,
      stderr: proc.stderr,
    };
  }
}
