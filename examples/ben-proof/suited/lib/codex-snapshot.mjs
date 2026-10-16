import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from './repertoire-config.mjs';

/** External Governance SSOT — term count from worn .xray/codex.json */
export function codexSnapshot() {
  const path = join(projectRoot(), '.xray', 'codex.json');
  if (!existsSync(path)) return { available: false };
  try {
    const codex = JSON.parse(readFileSync(path, 'utf8'));
    const terms = codex.terms;
    const termCount = Array.isArray(terms)
      ? terms.length
      : terms && typeof terms === 'object'
        ? Object.keys(terms).length
        : 0;
    return {
      available: true,
      version: codex.version ?? null,
      termCount,
    };
  } catch {
    return { available: false };
  }
}
