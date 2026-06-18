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
  /^\*{0,2}v[\d.]+\*{0,2}\s*—\s*\d+ agents · \d+ skills · \d+ MCP servers? · \d+ codex terms(?: · [\d,]+ tests)?/m;

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
    validate: (content, version, counts, header) => {
      const errors = [];
      if (!content.includes(header)) {
        errors.push(`missing or stale standard header (expected: ${header})`);
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
    validate: (content, version, counts) => {
      const errors = [];
      if (!content.includes(`**v${version}**`)) {
        errors.push(`missing version marker **v${version}**`);
      }
      if (!content.includes(`${counts.agents} agents`)) {
        errors.push(`expected ${counts.agents} agents in header`);
      }
      if (!content.includes(`${counts.skills} skills`)) {
        errors.push(`expected ${counts.skills} skills in header`);
      }
      if (!content.includes('68 codex terms')) {
        errors.push('expected 68 codex terms in header');
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
    validate: (content, version, counts) => {
      const errors = [];
      const expected = `**v${version}** — ${counts.mcps} MCP servers · ${counts.skills} skills · 68 codex terms`;
      if (!content.includes(expected)) {
        errors.push(`consumer header stale (expected substring: ${expected})`);
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
    validate: (content, version, counts) => {
      const errors = [];
      const expected = `**v${version}** — **${counts.skills} skills**`;
      if (!content.includes(expected)) {
        errors.push(`header stale (expected: ${expected})`);
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
  const first = content.match(/^## \[([^\]]+)\]/m);
  if (!first) {
    errors.push('no version sections found');
    return errors;
  }
  if (first[1] !== version) {
    errors.push(`top CHANGELOG entry is [${first[1]}], expected [${version}]`);
  }
  if (!content.includes(`## [${version}]`)) {
    errors.push(`missing ## [${version}] section`);
  }
  return errors;
}

function validateStandardHeader(content, expectedHeader, label) {
  const match = content.match(STANDARD_HEADER_RE);
  if (!match) {
    return [`${label}: no standard docs header line found`];
  }
  if (match[0] !== expectedHeader) {
    return [`${label}: header is "${match[0]}", expected "${expectedHeader}"`];
  }
  return [];
}

function validateDocusaurusTagline(content, counts) {
  const errors = [];
  const expectedParts = [
    `${counts.agents} agents`,
    `${counts.skills} skills`,
    `${counts.mcps} MCP servers`,
    '68 codex terms',
  ];
  for (const part of expectedParts) {
    if (!content.includes(part)) {
      errors.push(`docusaurus.config.ts tagline missing "${part}"`);
    }
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

  if (codexTerms !== null && codexTerms !== 68) {
    warnings.push(`codex.json has ${codexTerms} terms (docs reference 68)`);
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
    if (rel.includes('features-since-3.1') && !content.includes(version)) {
      errors.push(`${rel}: must reference current version ${version}`);
    }
  }

  const docusaurus = readFile(rootDir, 'docs-site/docusaurus.config.ts');
  if (!docusaurus) {
    errors.push('docs-site/docusaurus.config.ts: missing');
  } else {
    errors.push(...validateDocusaurusTagline(docusaurus, counts));
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