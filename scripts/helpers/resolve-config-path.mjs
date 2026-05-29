#!/usr/bin/env node

/**
 * Shared config path resolver for xray scripts (.mjs/.cjs/.js).
 *
 * Mirrors the logic in src/core/config-paths.ts so scripts don't need to
 * import compiled TypeScript. Supports XRAY_CONFIG_DIR env var.
 *
 * Usage:
 *   import { getConfigDir, resolveConfigPath } from "../helpers/resolve-config-path.mjs";
 *   // or for CJS:
 *   const { getConfigDir, resolveConfigPath } = require("../helpers/resolve-config-path.cjs");
 */

import { existsSync } from "fs";
import { join, resolve } from "path";

const XRAY_CONFIG_DIR_ENV = "XRAY_CONFIG_DIR";

/** Cache of resolved config dirs per project root */
const _cache = new Map();

/**
 * Detect the best available config directory.
 * Priority: XRAY_CONFIG_DIR > .opencode
 */
export function getConfigDir(projectRoot) {
  const root = projectRoot || process.cwd();
  const cached = _cache.get(root);
  if (cached) return cached;

  const envDir = process.env[XRAY_CONFIG_DIR_ENV];
  const candidates = [];

  if (envDir) {
    candidates.push(resolve(root, envDir));
  }
  candidates.push(join(root, ".opencode"));

  for (const dir of candidates) {
    if (existsSync(dir)) {
      _cache.set(root, dir);
      return dir;
    }
  }

  // Default: highest priority (env > .opencode)
  _cache.set(root, candidates[0]);
  return candidates[0];
}

/**
 * Resolve a specific config file using the standard priority chain.
 * Returns the first existing candidate, or the highest-priority default.
 */
export function resolveConfigPath(relativePath, projectRoot) {
  const root = projectRoot || process.cwd();
  const envDir = process.env[XRAY_CONFIG_DIR_ENV];

  const candidates = [];
  if (envDir) {
    candidates.push(resolve(root, envDir, relativePath));
  }
  candidates.push(join(root, ".opencode", relativePath));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] || null;
}
