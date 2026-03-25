import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface SuggestedSource {
  name: string;
  repo: string;
  license: string;
  description: string;
  skillPath?: string;
}

const SUGGESTED_SOURCES: SuggestedSource[] = [
  {
    name: "antigravity",
    repo: "https://github.com/sickn33/antigravity-awesome-skills",
    license: "MIT",
    description: "Curated community skills (TypeScript, Python, Docker, Security, etc.)",
    skillPath: "skills",
  },
  {
    name: "claude-seo",
    repo: "https://github.com/AgriciDaniel/claude-seo",
    license: "MIT",
    description: "SEO skills for audits, technical SEO, schema, and content analysis",
    skillPath: "skills",
  },
  {
    name: "minimax",
    repo: "https://github.com/MiniMax-AI/skills",
    license: "MIT",
    description: "Frontend, fullstack, Android, iOS, shader, PDF, XLSX, DOCX skills",
    skillPath: "skills",
  },
  {
    name: "vuejs-nuxt",
    repo: "https://github.com/robert-zaremba/ai-agent-skills",
    license: "MIT",
    description: "Vue.js 3, Nuxt 4+, Nuxt UI, and VueUse skills",
    skillPath: "vuejs-nuxt-bun/skills",
  },
  {
    name: "impeccable",
    repo: "https://github.com/pbakaus/impeccable",
    license: "Apache 2.0",
    description: "AI frontend design language for professional UI/UX generation",
  },
  {
    name: "openviking",
    repo: "https://github.com/volcengine/OpenViking",
    license: "Apache 2.0",
    description: "Context database for AI agents with hierarchical memory",
  },
];

function listSources(): void {
  console.log("");
  console.log("Install skills from any git repo:");
  console.log("");
  console.log("Usage:");
  console.log("  npx strray-ai skill:install <github-url>");
  console.log("  npx strray-ai skill:install <github-url> --path <subdir>");
  console.log("  npx strray-ai skill:install <suggested-name>");
  console.log("  npx strray-ai skill:install <github-url> --force");
  console.log("");
  console.log("Options:");
  console.log("  --path <dir>  Subdirectory in repo containing SKILL.md folders (default: skills/)");
  console.log("  --force      Reinstall even if skills already exist");
  console.log("");
  console.log("Suggested sources:");
  console.log("");

  for (const source of SUGGESTED_SOURCES) {
    console.log(`  ${source.name}`);
    console.log(`    ${source.description}`);
    console.log(`    ${source.repo}`);
    console.log(`    License: ${source.license}`);
    console.log("");
  }
}

function resolveSuggested(name: string): SuggestedSource | undefined {
  return SUGGESTED_SOURCES.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
}

function findSkillDirs(baseDir: string): string[] {
  const skillDirs: string[] = [];
  if (!fs.existsSync(baseDir)) return skillDirs;

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillMd = path.join(baseDir, entry.name, "SKILL.md");
      if (fs.existsSync(skillMd)) {
        skillDirs.push(entry.name);
      }
    }
  }
  return skillDirs;
}

function injectAttribution(content: string, repo: string): string {
  if (!content.startsWith("---")) return content;

  const endOfFrontmatter = content.indexOf("---", 3);
  if (endOfFrontmatter === -1) return content;

  const frontmatter = content.slice(3, endOfFrontmatter);
  const body = content.slice(endOfFrontmatter + 3);
  const attribLines = [
    `source: ${repo}`,
    `converted: ${new Date().toISOString()}`,
  ];
  return `---${frontmatter}${attribLines.join("\n")}\n---${body}`;
}

export async function skillInstallCommand(
  sourceArg?: string,
  options?: Record<string, unknown>
): Promise<void> {
  if (!sourceArg) {
    listSources();
    return;
  }

  let repo: string;
  let skillSubdir: string | undefined;

  const suggested = resolveSuggested(sourceArg);
  if (suggested) {
    repo = suggested.repo;
    skillSubdir = suggested.skillPath || "skills";
    console.log(`Installing ${suggested.name}...`);
    console.log(`Source: ${repo}`);
    console.log(`License: ${suggested.license}`);
    console.log("");
  } else {
    repo = sourceArg;
    skillSubdir = (options?.path as string) || "skills";
    console.log(`Installing skills from: ${repo}`);
    console.log(`Skill path: ${skillSubdir}`);
    console.log("");
  }

  if (!repo.startsWith("http")) {
    console.log(`Invalid repo URL: ${repo}`);
    console.log("Provide a GitHub URL or a suggested source name.");
    console.log("Run: npx strray-ai skill:install");
    process.exit(1);
  }

  const skillsDir = path.join(process.cwd(), ".opencode", "skills");
  const tempDir = path.join(process.cwd(), ".opencode", ".temp-skill-install");
  const force = !!(options?.force);

  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log("Cloning repository...");
    execSync(`git clone --depth 1 "${repo}" "${tempDir}"`, {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    const sourceDir = path.join(tempDir, skillSubdir);
    if (!fs.existsSync(sourceDir)) {
      console.log(`Skill path not found: ${skillSubdir}`);
      console.log("Use --path <dir> to specify the subdirectory containing SKILL.md folders.");
      console.log("");

      const rootDirs = findSkillDirs(tempDir);
      if (rootDirs.length > 0) {
        console.log(`Found ${rootDirs.length} skills in repo root. Try: --path .`);
      } else {
        const entries = fs.readdirSync(tempDir, { withFileTypes: true });
        const subdirs = entries
          .filter((e) => e.isDirectory() && !e.name.startsWith("."))
          .map((e) => e.name);
        if (subdirs.length > 0) {
          console.log("Subdirectories found:", subdirs.slice(0, 10).join(", "));
        }
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
      process.exit(1);
    }

    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }

    const skillDirs = findSkillDirs(sourceDir);
    if (skillDirs.length === 0) {
      console.log("No SKILL.md files found in the specified path.");
      fs.rmSync(tempDir, { recursive: true, force: true });
      process.exit(1);
    }

    console.log(`Found ${skillDirs.length} skills. Installing...\n`);

    let installed = 0;
    let skipped = 0;

    for (const skillName of skillDirs) {
      const srcPath = path.join(sourceDir, skillName, "SKILL.md");
      const destPath = path.join(skillsDir, skillName, "SKILL.md");
      const destDir = path.dirname(destPath);

      if (fs.existsSync(destPath) && !force) {
        console.log(`  ⏭️  ${skillName} (already exists, use --force to overwrite)`);
        skipped++;
        continue;
      }

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const content = fs.readFileSync(srcPath, "utf-8");
      const finalContent = injectAttribution(content, repo);
      fs.writeFileSync(destPath, finalContent);
      console.log(`  ✅ ${skillName}`);
      installed++;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log("");
    console.log(`Installed ${installed} skills (${skipped} skipped).`);
    console.log(`Location: ${skillsDir}/`);
    console.log("Restart OpenCode to load the new skills.");
  } catch (error) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    console.log(
      `Failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

export default skillInstallCommand;
