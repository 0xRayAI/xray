/**
 * Shared config path resolver for StringRay scripts (CJS version).
 * Mirrors src/core/config-paths.ts logic.
 */

"use strict";
const { existsSync } = require("fs");
const { join, resolve } = require("path");

const STRRAY_CONFIG_DIR_ENV = "STRRAY_CONFIG_DIR";

const _cache = new Map();

function getConfigDir(projectRoot) {
  const root = projectRoot || process.cwd();
  const cached = _cache.get(root);
  if (cached) return cached;

  const envDir = process.env[STRRAY_CONFIG_DIR_ENV];
  const candidates = [];

  if (envDir) {
    candidates.push(resolve(root, envDir));
  }
  candidates.push(join(root, ".strray"));
  candidates.push(join(root, ".opencode", "strray"));

  for (const dir of candidates) {
    if (existsSync(dir)) {
      _cache.set(root, dir);
      return dir;
    }
  }

  _cache.set(root, candidates[0]);
  return candidates[0];
}

function resolveConfigPath(relativePath, projectRoot) {
  const root = projectRoot || process.cwd();
  const envDir = process.env[STRRAY_CONFIG_DIR_ENV];

  const candidates = [];
  if (envDir) {
    candidates.push(resolve(root, envDir, relativePath));
  }
  candidates.push(join(root, ".strray", relativePath));
  candidates.push(join(root, ".opencode", "strray", relativePath));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] || null;
}

module.exports = { getConfigDir, resolveConfigPath, STRRAY_CONFIG_DIR_ENV };
