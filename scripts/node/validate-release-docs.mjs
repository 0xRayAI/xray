#!/usr/bin/env node
/**
 * validate-release-docs.mjs — Blocking guard for release doc freshness.
 *
 * Ensures README, AGENTS, SKILLS, CHANGELOG, Docusaurus headers, and required
 * guides match package.json version and live framework counts before tag/publish.
 *
 * Usage:
 *   node scripts/node/validate-release-docs.mjs
 *   node scripts/node/validate-release-docs.mjs --json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDocsHeader,
  DOCS_SITE_HEADER_FILES,
  getFrameworkCounts,
  getReleaseArtifactPaths,
} from './version-manager.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(__dirname, '../..');

const STANDARD_HEADER_RE =
  /\*{0,2}\d+\.\d+\*{0,2}\s*—\s*a suit that survives the context window/;

/** Patch stamps belong in CHANGELOG, not kernel headers. */
function kernelLineHasPatchStamp(content) {
  return /^\*\*v?\d+\.\d+\.\d+\*\*/m.test(content);
}

/** Guides that must exist and reference the current release (body or header). */
const REQUIRED_GUIDES = [
  'docs-site/docs/guides/features-since-3.1.md',
  'docs-site/docs/guides/features-json.md',
  'docs-site/docs/guides/memory-routing.md',
  'docs-site/docs/guides/aside-context.md',
  'docs-site/docs/guides/repertoire.md',
  'docs-site/docs/guides/integrations.md',
  'docs-site/docs/guides/consumer-migration.md',
  'docs-site/docs/mcp/README.md',
  'docs-site/docs/agents/README.md',
];

const ROOT_DOC_CHECKS = [
  {
    rel: 'README.md',
    validate: (content, _version, _counts, header) => {
      const errors = [];
      if (!content.includes(header) && !STANDARD_HEADER_RE.test(content)) {
        errors.push(`missing kernel header (expected substring: ${header})`);
      }
      if (kernelLineHasPatchStamp(content)) {
        errors.push('kernel header must be era (major.minor), not a patch stamp');
      }
      if (!content.includes('survive the context window') && !content.includes('survives the context window')) {
        errors.push('missing context-window / exo kernel copy');
      }
      if (!content.includes('SKILLS.md')) {
        errors.push('missing SKILLS.md reference in postinstall/docs section');
      }
      if (!content.includes('install-bridges') && !content.includes('installAllBridges')) {
        errors.push('missing install-bridges / installAllBridges reference');
      }
      return errors;
    },
  },
  {
    rel: 'AGENTS.md',
    validate: (content, _version) => {
      const errors = [];
      if (kernelLineHasPatchStamp(content)) {
        errors.push('kernel header must be era (major.minor), not a patch stamp');
      }
      if (!content.includes('survive the context window') && !content.includes('survives the context window') && !content.includes('Exo, not catalog')) {
        errors.push('missing exo / context-window kernel copy');
      }
      if (!content.includes('aside-context.md') && !content.includes('AsideContext')) {
        errors.push('missing AsideContext documentation reference');
      }
      if (!content.includes('SKILLS.md')) {
        errors.push('missing SKILLS.md link');
      }
      return errors;
    },
  },
  {
    rel: 'AGENTS-consumer.md',
    validate: (content) => {
      const errors = [];
      if (kernelLineHasPatchStamp(content)) {
        errors.push('kernel header must be era (major.minor), not a patch stamp');
      }
      if (!content.includes('survive the context window') && !content.includes('survives the context window')) {
        errors.push('consumer header missing context-window kernel copy');
      }
      if (!content.includes('SKILLS.md')) {
        errors.push('missing SKILLS.md in postinstall section');
      }
      if (!content.includes('AsideContext')) {
        errors.push('missing AsideContext section');
      }
      return errors;
    },
  },
  {
    rel: 'SKILLS.md',
    validate: (content, _version, counts) => {
      const errors = [];
      if (kernelLineHasPatchStamp(content)) {
        errors.push('kernel header must be era (major.minor), not a patch stamp');
      }
      if (!content.includes(`**${counts.skills} skills**`)) {
        errors.push(`skill count stale (expected **${counts.skills} skills**)`);
      }
      return errors;
    },
  },
];

function readFile(rootDir, rel) {
  const full = path.join(rootDir, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf-8');
}

function getPackageVersion(rootDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  return pkg.version;
}

function getCodexTermCount(rootDir) {
  const codexPath = path.join(rootDir, '.xray/codex.json');
  if (!fs.existsSync(codexPath)) return null;
  const codex = JSON.parse(fs.readFileSync(codexPath, 'utf-8'));
  return Object.keys(codex.terms || {}).length;
}

function validateChangelog(content, version) {
  const errors = [];
  const headings = [...content.matchAll(/^## \[([^\]]+)\]/gm)].map((m) => m[1]);
  if (headings.length === 0) {
    errors.push('no version sections found');
    return errors;
  }
  if (headings[0] === 'Unreleased') {
    if (headings[1] !== version) {
      errors.push(`after [Unreleased], expected [${version}], found [${headings[1] || 'none'}]`);
    }
  } else if (headings[0] !== version) {
    errors.push(`top CHANGELOG entry is [${headings[0]}], expected [${version}] or [Unreleased]`);
  }
  if (!content.includes(`## [${version}]`)) {
    errors.push(`missing ## [${version}] section`);
  }
  return errors;
}

function validateStandardHeader(content, expectedHeader, label) {
  if (!content.includes(expectedHeader) && !STANDARD_HEADER_RE.test(content)) {
    return [`${label}: missing kernel header (expected substring: ${expectedHeader})`];
  }
  return [];
}

function validateDocusaurusTagline(content) {
  const errors = [];
  if (!content.includes('survive the context window') && !content.includes('survives the context window')) {
    errors.push('docusaurus.config.ts tagline missing context-window kernel copy');
  }
  return errors;
}

/**
 * @param {string} [rootDir]
 * @returns {{ ok: boolean; version: string; counts: object; errors: string[]; warnings: string[] }}
 */
export function validateReleaseDocs(rootDir = defaultRoot) {
  const errors = [];
  const warnings = [];
  const version = getPackageVersion(rootDir);
  const counts = getFrameworkCounts(rootDir);
  const expectedHeader = buildDocsHeader(counts, version);
  const codexTerms = getCodexTermCount(rootDir);

  if (codexTerms !== null && counts.codexTerms && codexTerms !== counts.codexTerms) {
    warnings.push(`codex.json has ${codexTerms} terms (counts.codexTerms is ${counts.codexTerms})`);
  }

  const changelog = readFile(rootDir, 'CHANGELOG.md');
  if (!changelog) {
    errors.push('CHANGELOG.md missing');
  } else {
    errors.push(...validateChangelog(changelog, version).map((e) => `CHANGELOG.md: ${e}`));
  }

  for (const check of ROOT_DOC_CHECKS) {
    const content = readFile(rootDir, check.rel);
    if (!content) {
      errors.push(`${check.rel}: file missing`);
      continue;
    }
    const relErrors = check.validate(content, version, counts, expectedHeader);
    for (const e of relErrors) {
      errors.push(`${check.rel}: ${e}`);
    }
  }

  for (const rel of DOCS_SITE_HEADER_FILES) {
    const content = readFile(rootDir, rel);
    if (!content) {
      errors.push(`${rel}: file missing`);
      continue;
    }
    errors.push(...validateStandardHeader(content, expectedHeader, rel));
    if (kernelLineHasPatchStamp(content)) {
      errors.push(`${rel}: kernel header must be era (major.minor), not a patch stamp`);
    }
  }

  for (const rel of REQUIRED_GUIDES) {
    const content = readFile(rootDir, rel);
    if (!content) {
      errors.push(`${rel}: required guide missing`);
      continue;
    }
    if (content.trim().length < 200) {
      errors.push(`${rel}: guide too short — likely stub`);
    }

  }

  const docusaurus = readFile(rootDir, 'docs-site/docusaurus.config.ts');
  if (!docusaurus) {
    errors.push('docs-site/docusaurus.config.ts: missing');
  } else {
    errors.push(...validateDocusaurusTagline(docusaurus));
  }

  for (const rel of getReleaseArtifactPaths()) {
    if (!fs.existsSync(path.join(rootDir, rel))) {
      errors.push(`release artifact path missing: ${rel}`);
    }
  }

  return {
    ok: errors.length === 0,
    version,
    counts,
    errors,
    warnings,
  };
}

function main() {
  const jsonOut = process.argv.includes('--json');
  const result = validateReleaseDocs();

  if (!jsonOut) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        📚 Release Docs Validation                      ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n📌 package.json version: v${result.version}`);
    console.log(
      `📊 counts: ${result.counts.agents} agents · ${result.counts.skills} skills · ${result.counts.mcps} MCP servers\n`,
    );
  }

  if (result.warnings.length > 0 && !jsonOut) {
    console.log('⚠️  Warnings:');
    for (const w of result.warnings) console.log(`   - ${w}`);
    console.log();
  }

  if (!result.ok) {
    if (jsonOut) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Release docs validation FAILED:\n');
      for (const e of result.errors) console.error(`   • ${e}`);
      console.error('\nFix docs then run: npm run version:sync');
      console.error('Or: node scripts/node/validate-release-docs.mjs\n');
    }
    process.exit(1);
  }

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('✅ Release docs validation passed\n');
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}