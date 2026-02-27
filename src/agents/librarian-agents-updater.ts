/**
 * Librarian AGENTS.md Auto-Update Service
 *
 * Analyzes the project codebase and updates AGENTS.md to reflect
 * the current project state (frameworks, APIs, components, etc.)
 */

import * as fs from "fs";
import * as path from "path";

interface ProjectAnalysis {
  files: string[];
  packageJson?:
    | {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      }
    | undefined;
  fileTypes?: Record<string, number>;
}

interface ProjectInfo {
  frameworks: string[];
  languages: string[];
  apis: string[];
  components: string[];
  lastUpdated: string;
}

export class LibrarianAgentsUpdater {
  /**
   * Main entry point to update AGENTS.md based on project analysis
   */
  async updateAgentsMd(projectRoot: string = process.cwd()): Promise<void> {
    const agentsPath = path.join(projectRoot, "AGENTS.md");

    // Analyze project structure
    const analysis = await this.analyzeProject(projectRoot);

    // Detect project components
    const info = this.detectProjectInfo(analysis, projectRoot);

    // Generate updated AGENTS.md content
    const content = this.generateAgentsMd(info);

    // Write to file
    fs.writeFileSync(agentsPath, content, "utf-8");
    console.log(`[Librarian] Updated AGENTS.md at ${agentsPath}`);
  }

  private async analyzeProject(projectRoot: string): Promise<ProjectAnalysis> {
    const files: string[] = [];
    let packageJson: ProjectAnalysis["packageJson"] = {};

    // Read package.json if exists
    const pkgPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Recursively collect file paths (limit depth)
    const collectFiles = (dir: string, depth: number = 0) => {
      if (depth > 5) return; // Limit depth

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip common non-project directories
          if (entry.isDirectory()) {
            if (
              [
                ".git",
                "node_modules",
                "dist",
                "build",
                ".next",
                ".nuxt",
                "coverage",
                "__pycache__",
              ].includes(entry.name)
            ) {
              continue;
            }
            collectFiles(fullPath, depth + 1);
          } else {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Ignore permission errors
      }
    };

    collectFiles(projectRoot);

    return { files, packageJson };
  }

  private detectProjectInfo(
    analysis: ProjectAnalysis,
    projectRoot: string,
  ): ProjectInfo {
    const today = new Date().toISOString().split("T")[0] || "2026-02-16";
    return {
      frameworks: this.detectFrameworks(analysis),
      languages: this.detectLanguages(analysis),
      apis: this.detectAPIs(analysis, projectRoot),
      components: this.detectComponents(analysis),
      lastUpdated: today,
    };
  }

  private detectFrameworks(analysis: ProjectAnalysis): string[] {
    const frameworks: string[] = [];
    const deps = {
      ...analysis.packageJson?.dependencies,
      ...analysis.packageJson?.devDependencies,
    };

    const frameworkMap: Record<string, string> = {
      react: "React",
      "react-dom": "React",
      vue: "Vue",
      "@vue/core": "Vue",
      "@angular/core": "Angular",
      next: "Next.js",
      express: "Express",
      fastify: "Fastify",
      "@nestjs/core": "NestJS",
      django: "Django",
      flask: "Flask",
      "@springframework/core": "Spring",
      svelte: "Svelte",
    };

    for (const [dep, name] of Object.entries(frameworkMap)) {
      if (deps[dep] && !frameworks.includes(name)) {
        frameworks.push(name);
      }
    }
    return frameworks;
  }

  private detectLanguages(analysis: ProjectAnalysis): string[] {
    const languages: string[] = [];
    const extCounts: Record<string, number> = {};

    for (const file of analysis.files) {
      const ext = path.extname(file).slice(1);
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    }

    if (
      (extCounts["ts"] || extCounts["tsx"]) &&
      !languages.includes("TypeScript")
    ) {
      languages.push("TypeScript");
    }
    if (extCounts["js"] && !languages.includes("JavaScript")) {
      languages.push("JavaScript");
    }
    if (extCounts["py"]) languages.push("Python");
    if (extCounts["java"]) languages.push("Java");
    if (extCounts["go"]) languages.push("Go");
    if (extCounts["rs"]) languages.push("Rust");
    if (extCounts["rb"]) languages.push("Ruby");
    if (extCounts["php"]) languages.push("PHP");

    return languages;
  }

  private detectAPIs(analysis: ProjectAnalysis, projectRoot: string): string[] {
    const apis: string[] = [];
    const relFiles = analysis.files.map((f) => path.relative(projectRoot, f));

    // Detect REST API patterns
    if (
      relFiles.some(
        (f) =>
          f.includes("/api/") ||
          f.includes("/routes/") ||
          f.includes("/router"),
      )
    ) {
      apis.push("REST API");
    }
    // Detect GraphQL
    if (
      relFiles.some(
        (f) =>
          f.includes(".graphql") ||
          f.includes("schema.gql") ||
          f.includes("resolvers"),
      )
    ) {
      apis.push("GraphQL");
    }
    // Detect gRPC
    if (relFiles.some((f) => f.includes(".proto"))) {
      apis.push("gRPC");
    }
    // Detect WebSocket
    if (
      relFiles.some(
        (f) =>
          f.includes("websocket") ||
          f.includes("ws.") ||
          f.includes("socket.io"),
      )
    ) {
      apis.push("WebSocket");
    }
    // Detect tRPC
    if (relFiles.some((f) => f.includes("trpc") || f.includes("trouter"))) {
      apis.push("tRPC");
    }

    return apis;
  }

  private detectComponents(analysis: ProjectAnalysis): string[] {
    const components: string[] = [];
    const relFiles = analysis.files.map((f) => path.relative(process.cwd(), f));

    // Detect common component patterns
    if (
      relFiles.some(
        (f) =>
          f.includes("/components/") ||
          f.includes("/Component") ||
          f.includes(".component."),
      )
    ) {
      components.push("UI Components");
    }
    if (
      relFiles.some(
        (f) =>
          f.includes("/services/") ||
          f.includes("/service.") ||
          f.includes("/api/"),
      )
    ) {
      components.push("Services");
    }
    if (
      relFiles.some(
        (f) =>
          f.includes("/models/") ||
          f.includes("/schemas/") ||
          f.includes("/entities/"),
      )
    ) {
      components.push("Data Models");
    }
    if (relFiles.some((f) => f.includes("/middleware/"))) {
      components.push("Middleware");
    }
    if (relFiles.some((f) => f.includes("/hooks/") || f.includes("use."))) {
      components.push("Hooks");
    }
    if (
      relFiles.some(
        (f) =>
          f.includes("/store/") ||
          f.includes("/state/") ||
          f.includes("redux") ||
          f.includes("zustand"),
      )
    ) {
      components.push("State Management");
    }
    if (
      relFiles.some((f) => f.includes("/utils/") || f.includes("/helpers/"))
    ) {
      components.push("Utilities");
    }
    if (
      relFiles.some((f) => f.includes("/config/") || f.includes("/settings/"))
    ) {
      components.push("Configuration");
    }

    return components;
  }

  private generateAgentsMd(info: ProjectInfo): string {
    const sections: string[] = [];

    sections.push(`# ${path.basename(process.cwd())} - Project Agents Guide`);
    sections.push("");
    sections.push(`**Last Updated**: ${info.lastUpdated}`);
    sections.push(`**Generated by**: StringRay AI Librarian`);
    sections.push("");
    sections.push("---");
    sections.push("");

    if (info.frameworks.length > 0) {
      sections.push("## Frameworks & Libraries");
      sections.push(info.frameworks.map((f) => `- ${f}`).join("\n"));
      sections.push("");
    }

    if (info.languages.length > 0) {
      sections.push("## Languages");
      sections.push(info.languages.map((l) => `- ${l}`).join("\n"));
      sections.push("");
    }

    if (info.apis.length > 0) {
      sections.push("## APIs");
      sections.push(info.apis.map((a) => `- ${a}`).join("\n"));
      sections.push("");
    }

    if (info.components.length > 0) {
      sections.push("## Project Components");
      sections.push(info.components.map((c) => `- ${c}`).join("\n"));
      sections.push("");
    }

    // Add plugin systems clarification (IMPORTANT)
    sections.push("## Plugin Systems (IMPORTANT: Two Different Systems!)");
    sections.push("");
    sections.push(
      "StringRay has **two distinct plugin systems** - do NOT confuse them:",
    );
    sections.push("");
    sections.push("### 1. OpenCode Plugin (`.opencode/plugin/`)");
    sections.push("**Purpose:** Injects StringRay into OpenCode framework");
    sections.push("- Location: `.opencode/plugin/strray-codex-injection.js`");
    sections.push(
      "- What it does: Injects Universal Development Codex into OpenCode's AI agents",
    );
    sections.push(
      "- For: OpenCode integration, NOT for third-party extensions",
    );
    sections.push("");
    sections.push("### 2. StringRay Plugin Ecosystem (`src/plugins/`)");
    sections.push(
      "**Purpose:** Third-party plugin system for extending StringRay",
    );
    sections.push("- Location: `src/plugins/`");
    sections.push("- Components:");
    sections.push(
      "  - `plugin-system.ts` - Core: PluginRegistry, PluginSandbox, PluginValidator",
    );
    sections.push("  - `marketplace/` - Plugin discovery and download service");
    sections.push(
      "- What it does: Allows third-party developers to create custom agents",
    );
    sections.push("- For: Third-party plugins, NOT OpenCode integration");
    sections.push("");
    sections.push("### Quick Reference");
    sections.push("| What You Want | Use This |");
    sections.push("|---------------|----------|");
    sections.push("| Extend StringRay with custom agents | `src/plugins/` |");
    sections.push("| Inject codex into OpenCode | `.opencode/plugin/` |");

    sections.push("---");
    sections.push(
      "*This AGENTS.md is auto-maintained by StringRay AI Librarian*",
    );

    return sections.join("\n");
  }
}

// Export singleton instance
export const librarianAgentsUpdater = new LibrarianAgentsUpdater();
