#!/usr/bin/env node

/**
 * 0xRay Docs → Docusaurus Migration Script
 *
 * Converts 387 markdown files from the docs/ directory into a Docusaurus site.
 * Handles frontmatter injection, slug generation, internal link rewriting,
 * categorization, and sidebar generation.
 *
 * Usage: node scripts/migrate-to-docusaurus.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from "fs";
import { join, relative, dirname, basename, extname } from "path";

// ── Configuration ──────────────────────────────────────────────────────────

const ROOT_DIR = process.cwd();
const SOURCE_DOCS = join(ROOT_DIR, "docs");
const OUTPUT_DIR = join(ROOT_DIR, "docs-site", "docs");
const SIDEBARS_OUTPUT = join(ROOT_DIR, "docs-site", "sidebars.ts");

// Directories to EXCLUDE from migration (noise, templates, debug dumps)
const EXCLUDE_DIRS = new Set([
  "archive/historical",
  "archive/obsolete",
  "archive/operations",
  "archive/superseded",
  "archive/legacy/xray-framework",
  "archive/legacy",
  "archive/deployment",
  "debug-reports",
  "data-collection-reports",
  "inference-reports",
  "pattern-analytics-reports",
  "superseded",
  "superseded/legacy",
  "analysis-reports",
  "phase1-finalization",
  "removals",
  "web",
]);

// Files to EXCLUDE by name pattern
const EXCLUDE_PATTERNS = [
  /TEMPLATE\.md$/,
  /JOURNEY_TEMPLATE\.md$/,
  /REFLECTION_COMMAND_SYSTEM\.md$/,
  /REFLECTION_LOG_SUMMARY\.md$/,
  /REFACTORING_LOG\.md$/,
  /DEEP_REFLECTION_/,
  /KERNEL_/,
  /NEXT_KERNEL_/,
  /HONEST_KERNEL_/,
  /FINAL_KERNEL_/,
  /KERNEL_EXPERIENCE/,
  /xray_v2_log\.md$/,
  /master-agent-template\.md$/,
  /agent-template-dev\.md$/,
  /agents_template\.md$/,
  /index\.md$/,
];

// Directory mapping: source → docusaurus destination
const DIR_MAP = {
  "releases": "releases",
  "reflections": "reflections",
  "reflections/deep": "reflections/deep",
  "reflections/legacy": "reflections/archive",
  "reflections/sessions": "reflections/sessions",
  "research": "research",
  "research/agency-agents": "research/agency-agents",
  "research/antigravity": "research/antigravity",
  "research/impeccable": "research/impeccable",
  "research/lightpanda": "research/lightpanda",
  "research/mirofish": "research/mirofish",
  "research/openclaw": "research/openclaw",
  "research/openviking": "research/openviking",
  "research/superpowers": "research/superpowers",
  "architecture": "architecture",
  "pipeline-trees": "architecture/pipelines",
  "migrations": "migrations",
  "advanced": "architecture/advanced",
  "agents": "agents",
  "agents/analysis": "agents/analysis",
  "deployment": "deployment",
  "operations/deployment": "deployment",
  "operations/migration": "migrations",
  "security": "security",
  "testing": "testing",
  "performance": "performance",
  "tools": "tools",
  "user-guide": "guides",
  "user-guide/getting-started": "guides/getting-started",
  "user-guide/installation": "guides/installation",
  "user-guide/configuration": "guides/configuration",
  "guides": "guides",
  "quickstart": "guides/quickstart",
  "roadmap": "roadmap",
  "governance": "governance",
  "commands": "reference/commands",
  "reference": "reference",
  "reference/templates": "reference/templates",
  "integration": "integration",
  "api": "api",
  "reports": "reports",
  "development": "development",
  "enhancements": "enhancements",
  "implementation-status": "implementation-status",
  "implementation-summary": "implementation-summary",
  "selection": "selection",
  "session-summary": "sessions",
  "analytics": "analytics",
};

// Tags by directory
const DIR_TAGS = {
  "releases": ["release"],
  "reflections": ["reflection"],
  "reflections/deep": ["reflection", "deep-dive"],
  "research": ["research"],
  "architecture": ["architecture"],
  "pipeline-trees": ["architecture", "pipelines"],
  "migrations": ["migration"],
  "agents": ["agents"],
  "deployment": ["deployment"],
  "security": ["security"],
  "testing": ["testing"],
  "performance": ["performance"],
  "tools": ["tools"],
  "user-guide": ["guide"],
  "guides": ["guide"],
  "quickstart": ["guide", "quickstart"],
  "roadmap": ["roadmap"],
  "governance": ["governance"],
  "commands": ["reference", "commands"],
  "reference": ["reference"],
  "integration": ["integration"],
  "api": ["api"],
  "development": ["development"],
  "enhancements": ["enhancement"],
  "analytics": ["analytics"],
};

// ── Utilities ──────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromFilename(filename) {
  return basename(filename, extname(filename))
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/v(\d)/g, "v$1")
    .replace(/Md$/g, "MD")
    .replace(/Api$/g, "API")
    .replace(/Cicd/g, "CI/CD")
    .replace(/Mcp/g, "MCP")
    .replace(/Npm/g, "npm")
    .replace(/Uvm/g, "UVM")
    .replace(/Esm/g, "ESM")
    .replace(/Cdn/g, "CDN")
    .replace(/Cli/g, "CLI")
    .replace(/Sdk/g, "SDK")
    .replace(/Docker/g, "Docker")
    .replace(/Ts/g, "TypeScript")
    .replace(/Js/g, "JavaScript");
}

function extractVersionFromFilename(filename) {
  const match = filename.match(/v?(\d+\.\d+\.?\d*)/);
  return match ? match[1] : null;
}

function extractDateFromFilename(filename) {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function shouldExclude(filePath) {
  const relPath = relative(SOURCE_DOCS, filePath);

  for (const excludeDir of EXCLUDE_DIRS) {
    if (relPath.startsWith(excludeDir + "/") || relPath === excludeDir) {
      return true;
    }
  }

  const fname = basename(filePath);
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(fname)) {
      return true;
    }
  }

  return false;
}

function mapDirectory(sourceDir) {
  return DIR_MAP[sourceDir] || sourceDir;
}

function getTags(sourceDir) {
  for (const [dir, tags] of Object.entries(DIR_TAGS)) {
    if (sourceDir === dir || sourceDir.startsWith(dir + "/")) {
      return tags;
    }
  }
  return [];
}

// ── Frontmatter Generation ─────────────────────────────────────────────────

function generateFrontmatter(filePath, sourceDir, sidebarPosition) {
  const fname = basename(filePath, ".md");
  const title = titleFromFilename(fname);
  const version = extractVersionFromFilename(fname);
  const date = extractDateFromFilename(fname);
  const tags = getTags(sourceDir);
  const slugPath = mapDirectory(sourceDir);

  let slug = `/docs/${slugPath}/${slugify(fname)}`;

  // Special handling for releases
  if (sourceDir === "releases" && version) {
    slug = `/releases/${slugify("v" + version)}`;
  }

  // Special handling for deep reflections
  if (sourceDir === "reflections/deep") {
    slug = `/reflections/deep/${slugify(fname)}`;
  }

  const fm = {
    slug,
    title,
    sidebar_label: version ? `v${version}` : (title.length > 40 ? title.substring(0, 40) + "…" : title),
    sidebar_position: sidebarPosition,
  };

  if (tags.length > 0) fm.tags = tags;
  if (version) fm.version = version;
  if (date) fm.date = date;

  return fm;
}

function formatFrontmatter(fm) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `"${v}"`).join(", ")}]`);
    } else if (typeof value === "string" && (value.includes(":") || value.includes("/") || value.includes(" "))) {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

// ── Content Processing ─────────────────────────────────────────────────────

function processContent(content, sourceDir) {
  // Strip existing frontmatter if present
  content = content.replace(/^---\n[\s\S]*?\n---\n?/, "");

  // Escape ALL MDX-problematic patterns:
  // 1. < followed by digit (e.g., <3, <10) → &lt;3
  content = content.replace(/<(\d)/g, "&lt;$1");

  // 2. Escape ALL curly braces outside code blocks
  //    MDX interprets {anything} as JavaScript expressions
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeFence = "";
  content = lines.map((line) => {
    const trimmed = line.trim();
    // Detect code fence
    if (trimmed.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeFence = trimmed.slice(0, trimmed.lastIndexOf("`") + 1);
      } else if (trimmed.startsWith(codeFence)) {
        inCodeBlock = false;
        codeFence = "";
      }
      return line;
    }
    if (inCodeBlock) return line;

    // Escape ALL curly braces outside code blocks
    line = line.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
    return line;
  }).join("\n");

  // 3. Fix relative image paths
  content = content.replace(
    /!\[([^\]]*)\]\(\.\.?\/([^)]+)\)/g,
    (_, alt, imgPath) => `![${alt}](/img/${imgPath})`
  );

  // 4. Fix internal markdown links to other docs
  content = content.replace(
    /\[([^\]]+)\]\(([^)]+\.md)\)/g,
    (_, text, link) => {
      if (link.startsWith("http")) return `[${text}](${link})`;
      const linkBase = link.replace(/\.md$/, "").replace(/^\.?\//, "");
      const slug = `/docs/${slugify(linkBase)}`;
      return `[${text}](${slug})`;
    }
  );

  // 5. Clean up excessive blank lines
  content = content.replace(/\n{4,}/g, "\n\n\n");

  // 6. Ensure file ends with newline
  content = content.trimEnd() + "\n";

  return content;
}

// ── Scan & Collect ─────────────────────────────────────────────────────────

function scanDocs() {
  const files = [];

  function walk(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith(".md")) {
        if (!shouldExclude(fullPath)) {
          const sourceDir = relative(SOURCE_DOCS, dirname(fullPath));
          files.push({
            source: fullPath,
            sourceDir: sourceDir === "." ? "" : sourceDir,
            filename: entry,
          });
        }
      }
    }
  }

  walk(SOURCE_DOCS);
  return files;
}

// ── Sidebar Generation ─────────────────────────────────────────────────────

function generateSidebars(migratedFiles) {
  // Group by docusaurus directory
  const groups = {};
  for (const f of migratedFiles) {
    const dir = f.docusaurusDir;
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(f);
  }

  // Sort files within each group by sidebar_position
  for (const dir of Object.keys(groups)) {
    groups[dir].sort((a, b) => a.sidebarPosition - b.sidebarPosition);
  }

  // Build sidebar structure using autogenerated for reliability
  const categoryOrder = [
    { key: "guides", label: "Guides" },
    { key: "releases", label: "Releases" },
    { key: "reflections", label: "Reflections" },
    { key: "architecture", label: "Architecture" },
    { key: "agents", label: "Agents" },
    { key: "research", label: "Research" },
    { key: "deployment", label: "Deployment" },
    { key: "security", label: "Security" },
    { key: "testing", label: "Testing" },
    { key: "performance", label: "Performance" },
    { key: "reference", label: "Reference" },
    { key: "tools", label: "Tools" },
    { key: "migrations", label: "Migrations" },
    { key: "integration", label: "Integration" },
    { key: "api", label: "API" },
    { key: "development", label: "Development" },
    { key: "roadmap", label: "Roadmap" },
    { key: "governance", label: "Governance" },
    { key: "analytics", label: "Analytics" },
    { key: "reports", label: "Reports" },
    { key: "enhancements", label: "Enhancements" },
    { key: "implementation-status", label: "Implementation Status" },
    { key: "implementation-summary", label: "Implementation Summary" },
    { key: "selection", label: "Selection" },
    { key: "sessions", label: "Sessions" },
    { key: "operations", label: "Operations" },
  ];

  const sidebarItems = [];

  for (const cat of categoryOrder) {
    const matchingDirs = Object.keys(groups).filter(
      (d) => d === cat.key || d.startsWith(cat.key + "/")
    );

    if (matchingDirs.length === 0) continue;

    if (matchingDirs.length === 1 && matchingDirs[0] === cat.key) {
      // Simple category - use autogenerated
      sidebarItems.push(`    {
      type: 'category',
      label: '${cat.label}',
      link: { type: 'generated-index', slug: '/${cat.key}' },
      items: [{ type: 'autogenerated', dirName: '${cat.key}' }],
    }`);
    } else {
      // Nested categories
      const subItems = [];
      for (const subDir of matchingDirs.sort()) {
        const subLabel = subDir.split("/").pop().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        subItems.push(`        {
          type: 'category',
          label: '${subLabel}',
          link: { type: 'generated-index', slug: '/${subDir}' },
          items: [{ type: 'autogenerated', dirName: '${subDir}' }],
        }`);
      }

      sidebarItems.push(`    {
      type: 'category',
      label: '${cat.label}',
      items: [
${subItems.join(",\n")},
      ],
    }`);
    }
  }

  return `/**
 * Docusaurus Sidebar Configuration
 * Auto-generated by migrate-to-docusaurus.mjs
 * Generated: ${new Date().toISOString().split("T")[0]}
 */

import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
${sidebarItems.join(",\n")},
  ],
};

export default sidebars;
`;
}

// ── Main Migration ─────────────────────────────────────────────────────────

function migrate() {
  console.log("🚀 0xRay Docs → Docusaurus Migration");
  console.log("=".repeat(50));

  // Scan
  console.log("\n📁 Scanning docs/...");
  const allFiles = scanDocs();
  console.log(`   Found ${allFiles.length} eligible files`);

  // Create output directory
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Process files
  console.log("\n🔄 Processing files...");
  const migrated = [];
  const skipped = [];
  const errors = [];

  // Group by docusaurus dir for sidebar positioning
  const dirCounts = {};

  for (const file of allFiles) {
    try {
      const content = readFileSync(file.source, "utf-8");

      // Skip files that are too large (debug dumps)
      if (content.length > 50000) {
        skipped.push({ file: file.source, reason: "too large (>50KB)" });
        continue;
      }

      // Skip empty files
      if (content.trim().length < 10) {
        skipped.push({ file: file.source, reason: "too short" });
        continue;
      }

      const docusaurusDir = mapDirectory(file.sourceDir);
      const sidebarPosition = (dirCounts[docusaurusDir] || 0) + 1;
      dirCounts[docusaurusDir] = sidebarPosition;

      const fm = generateFrontmatter(file.source, file.sourceDir, sidebarPosition);
      const processedContent = processContent(content, file.sourceDir);
      const frontmatter = formatFrontmatter(fm);

      const outputPath = join(OUTPUT_DIR, docusaurusDir, file.filename);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, frontmatter + "\n\n" + processedContent, "utf-8");

      migrated.push({
        source: file.source,
        output: outputPath,
        docusaurusDir,
        docusaurusPath: join(docusaurusDir, file.filename).replace(/\.md$/, ""),
        sidebarPosition,
        title: fm.title,
        tags: fm.tags || [],
      });
    } catch (err) {
      errors.push({ file: file.source, error: err.message });
    }
  }

  // Generate sidebars
  console.log("\n📋 Generating sidebars.ts...");
  const sidebarContent = generateSidebars(migrated);
  mkdirSync(dirname(SIDEBARS_OUTPUT), { recursive: true });
  writeFileSync(SIDEBARS_OUTPUT, sidebarContent, "utf-8");

  // Generate Docusaurus config
  console.log("\n⚙️  Generating docusaurus.config.ts...");
  const configContent = generateConfig();
  writeFileSync(join(ROOT_DIR, "docs-site", "docusaurus.config.ts"), configContent, "utf-8");

  // Generate package.json
  console.log("\n📦 Generating package.json...");
  const pkgContent = generatePackageJson();
  writeFileSync(join(ROOT_DIR, "docs-site", "package.json"), pkgContent, "utf-8");

  // Generate babel.config.js
  writeFileSync(
    join(ROOT_DIR, "docs-site", "babel.config.js"),
    "module.exports = { presets: [require.resolve('@docusaurus/core/lib/babel/preset')] };\n"
  );

  // Generate src/css/custom.css
  mkdirSync(join(ROOT_DIR, "docs-site", "src", "css"), { recursive: true });
  writeFileSync(
    join(ROOT_DIR, "docs-site", "src", "css", "custom.css"),
    `/**
 * 0xRay Docusaurus Custom CSS
 */

:root {
  --ifm-color-primary: #2563eb;
  --ifm-color-primary-dark: #1d4ed8;
  --ifm-color-primary-darker: #1e40af;
  --ifm-color-primary-darkest: #1e3a8a;
  --ifm-color-primary-light: #3b82f6;
  --ifm-color-primary-lighter: #60a5fa;
  --ifm-color-primary-lightest: #93c5fd;
  --ifm-code-font-size: 95%;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] {
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.3);
}

/* Reflection styling */
.markdown blockquote {
  border-left: 4px solid var(--ifm-color-primary);
  padding-left: 1rem;
}

/* Pipeline tree styling */
.markdown pre {
  font-size: 0.85rem;
}
`
  );

  // Generate src/pages/index.tsx
  mkdirSync(join(ROOT_DIR, "docs-site", "src", "pages"), { recursive: true });
  writeFileSync(
    join(ROOT_DIR, "docs-site", "src", "pages", "index.tsx"),
    `import React from 'react';
import { Redirect } from '@docusaurus/router';

export default function Home() {
  return <Redirect to="/docs/introduction" />;
}
`
  );

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ Migration Complete!");
  console.log("=".repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Migrated:  ${migrated.length} files`);
  console.log(`   Skipped:   ${skipped.length} files`);
  console.log(`   Errors:    ${errors.length} files`);

  if (skipped.length > 0) {
    console.log(`\n⏭️  Skipped files:`);
    for (const s of skipped.slice(0, 10)) {
      console.log(`   - ${relative(SOURCE_DOCS, s.file)} (${s.reason})`);
    }
    if (skipped.length > 10) {
      console.log(`   ... and ${skipped.length - 10} more`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    for (const e of errors) {
      console.log(`   - ${relative(SOURCE_DOCS, e.file)}: ${e.error}`);
    }
  }

  console.log(`\n📁 Output: ${OUTPUT_DIR}`);
  console.log(`📋 Sidebar: ${SIDEBARS_OUTPUT}`);

  console.log(`\n🚀 Next steps:`);
  console.log(`   1. cd docs-site`);
  console.log(`   2. npm install`);
  console.log(`   3. npm start`);
  console.log(`   4. Add docs/introduction.md as the landing page`);

  // Write migration report
  const report = {
    date: new Date().toISOString(),
    totalScanned: allFiles.length,
    migrated: migrated.length,
    skipped: skipped.length,
    errors: errors.length,
    migratedFiles: migrated.map((f) => ({
      source: relative(SOURCE_DOCS, f.source),
      output: f.docusaurusPath,
      title: f.title,
      tags: f.tags,
      sidebarPosition: f.sidebarPosition,
    })),
    skippedFiles: skipped.map((s) => ({
      file: relative(SOURCE_DOCS, s.file),
      reason: s.reason,
    })),
    errorFiles: errors.map((e) => ({
      file: relative(SOURCE_DOCS, e.file),
      error: e.error,
    })),
  };

  const reportPath = join(ROOT_DIR, "docs", "MIGRATION-REPORT.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n📄 Report: ${reportPath}`);
}

function generateConfig() {
  return `import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: '0xRay',
  tagline: 'Enterprise AI Orchestration Framework',
  favicon: 'img/favicon.ico',
  url: 'https://stringray.dev',
  baseUrl: '/',
  organizationName: 'htafolla',
  projectName: '0xRay',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/htafolla/0xRay/tree/master/',
          routeBasePath: 'docs',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: '0xRay',
      logo: {
        alt: '0xRay Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/htafolla/0xRay',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://npmjs.com/package/0xray',
          label: 'npm',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/guides/getting-started' },
            { label: 'Architecture', to: '/docs/architecture' },
            { label: 'Agents', to: '/docs/agents' },
            { label: 'Releases', to: '/docs/releases' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/htafolla/0xRay' },
            { label: 'npm', href: 'https://npmjs.com/package/0xray' },
          ],
        },
      ],
      copyright: \`Copyright © \${new Date().getFullYear()} 0xRay. Built with Docusaurus.\`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
`;
}

function generatePackageJson() {
  return JSON.stringify(
    {
      name: "stringray-docs",
      version: "1.0.0",
      private: true,
      scripts: {
        docusaurus: "docusaurus",
        start: "docusaurus start",
        build: "docusaurus build",
        swizzle: "docusaurus swizzle",
        deploy: "docusaurus deploy",
        clear: "docusaurus clear",
        serve: "docusaurus serve",
        "write-translations": "docusaurus write-translations",
        "write-heading-ids": "docusaurus write-heading-ids",
        typecheck: "tsc",
        migrate: "node ../scripts/migrate-to-docusaurus.mjs",
      },
      dependencies: {
        "@docusaurus/core": "3.7.0",
        "@docusaurus/preset-classic": "3.7.0",
        "@mdx-js/react": "^3.0.0",
        clsx: "^2.0.0",
        prism: "prism-react-renderer",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@docusaurus/module-type-aliases": "3.7.0",
        "@docusaurus/tsconfig": "3.7.0",
        "@docusaurus/types": "3.7.0",
        typescript: "~5.6.2",
      },
      browserslist: {
        production: [">0.5%", "not dead", "not op_mini all"],
        development: [
          "last 3 chrome version",
          "last 3 firefox version",
          "last 5 safari version",
        ],
      },
      engines: {
        node: ">=18.0",
      },
    },
    null,
    2
  );
}

// ── Run ────────────────────────────────────────────────────────────────────

migrate();
