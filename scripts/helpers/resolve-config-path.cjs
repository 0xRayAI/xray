/**
 * Shared config path resolver for xray scripts (CJS version).
 * Mirrors src/core/config-paths.ts logic.
 */

"use strict";
const { existsSync } = require("fs");
const { join, resolve } = require("path");

const XRAY_CONFIG_DIR_ENV = "XRAY_CONFIG_DIR";

const _cache = new Map();

function getConfigDir(projectRoot) {
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

  _cache.set(root, candidates[0]);
  return candidates[0];
}

function resolveConfigPath(relativePath, projectRoot) {
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

module.exports = { getConfigDir, resolveConfigPath, XRAY_CONFIG_DIR_ENV };
