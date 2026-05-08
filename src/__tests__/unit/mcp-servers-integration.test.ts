/**
 * MCP Server Integration Tests
 *
 * Tests for new MCP servers and Antigravity integration
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";

describe("MCP Server Files", () => {
  it("should have bug-triage-specialist server file", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/knowledge-skills/bug-triage-specialist.server.ts",
    );
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  it("should have log-monitor server file", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/knowledge-skills/log-monitor.server.ts",
    );
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  it("should have session-management server file", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/knowledge-skills/session-management.server.ts",
    );
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  it("should have code-analyzer server file", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/knowledge-skills/code-analyzer.server.ts",
    );
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  it("should have architect-tools server file", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/architect-tools.server.ts",
    );
    expect(fs.existsSync(serverPath)).toBe(true);
  });
});

describe("Antigravity Skills Integration", () => {
  it("should have removed Antigravity integration script (migrated to skill:install)", () => {
    const scriptPath = path.join(
      process.cwd(),
      "scripts/integrations/install-antigravity-skills.js",
    );
    expect(fs.existsSync(scriptPath)).toBe(false);
  });

  it("should have Antigravity documentation", () => {
    const docPath = path.join(process.cwd(), "docs/archive/active-archived/superseded/legacy/ANTIGRAVITY_INTEGRATION.md");
    expect(fs.existsSync(docPath)).toBe(true);
  });

  it("should have Antigravity license file", () => {
    const licensePath = path.join(process.cwd(), "licenses/skills/LICENSE.antigravity");
    expect(fs.existsSync(licensePath)).toBe(true);
  });

  it("should list curated skills in documentation", () => {
    const docPath = path.join(process.cwd(), "docs/archive/active-archived/superseded/legacy/ANTIGRAVITY_INTEGRATION.md");
    const content = fs.readFileSync(docPath, "utf-8");

    expect(content).toContain("typescript-expert");
    expect(content).toContain("python-patterns");
    expect(content).toContain("docker-expert");
    expect(content).toContain("copywriting");
    expect(content).toContain("brainstorming");
  });
});

describe("Agent Configuration", () => {
  it("should have AGENTS.md updated", () => {
    const agentsPath = path.join(process.cwd(), "AGENTS.md");
    expect(fs.existsSync(agentsPath)).toBe(true);
    const content = fs.readFileSync(agentsPath, "utf-8");
    // Check for essential AGENTS.md content
    expect(content).toContain("StringRay");
    expect(content).toContain("Agents");
    expect(content).toContain("invocation");
  });
});

describe("MCP Client Configuration", () => {
  it("should have MCP client with new server configs", () => {
    const configPath = path.join(process.cwd(), "src/mcps/config/server-config-registry.ts");
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, "utf-8");

    // Check for new MCP configs in registry (refactored location)
    expect(content).toContain("bug-triage-specialist");
    expect(content).toContain("log-monitor");
    expect(content).toContain("code-analyzer");
  });
});

describe("Architect Tools MCP Server", () => {
  it("should import from architect-tools.ts library", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/architect-tools.server.ts",
    );
    const content = fs.readFileSync(serverPath, "utf-8");

    expect(content).toContain('from "../architect/architect-tools.js"');
    expect(content).toContain("architectContextAnalysis");
    expect(content).toContain("architectCodebaseStructure");
    expect(content).toContain("architectDependencyAnalysis");
    expect(content).toContain("architectArchitectureAssessment");
  });

  it("should delegate all 4 tool handlers to library functions", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/architect-tools.server.ts",
    );
    const content = fs.readFileSync(serverPath, "utf-8");

    expect(content).toContain("case \"context-analysis\":");
    expect(content).toContain("case \"codebase-structure\":");
    expect(content).toContain("case \"dependency-analysis\":");
    expect(content).toContain("case \"architecture-assessment\":");

    expect(content).toContain("await architectContextAnalysis(projectRoot, includeFiles, depth)");
    expect(content).toContain("await architectCodebaseStructure(projectRoot, includeMetrics)");
    expect(content).toContain("await architectDependencyAnalysis(projectRoot, focusAreas)");
    expect(content).toContain("await architectArchitectureAssessment(projectRoot, assessmentType)");
  });

  it("should register all 4 tools with ListToolsRequestSchema", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/architect-tools.server.ts",
    );
    const content = fs.readFileSync(serverPath, "utf-8");

    expect(content).toContain('name: "context-analysis"');
    expect(content).toContain('name: "codebase-structure"');
    expect(content).toContain('name: "dependency-analysis"');
    expect(content).toContain('name: "architecture-assessment"');
  });

  it("should have no inline simplified implementations (dead code)", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/architect-tools.server.ts",
    );
    const content = fs.readFileSync(serverPath, "utf-8");

    // The comment that used to say "simplified implementation" should not appear
    const simplifiedMatch = content.match(/simplified implementation/i);
    const hasDirectoryNodeClass = content.includes("class DirectoryNode");
    const hasFileNodeClass = content.includes("interface FileNode");

    expect(simplifiedMatch).toBeNull();
    // DirectoryNode and FileNode still exist as types for codebase-structure
    // but there should be no standalone inline impl methods
    expect(hasDirectoryNodeClass || hasFileNodeClass).toBe(true);
    // Verify no old helper methods remain
    expect(content).not.toContain("private analyzeProjectRoot(");
    expect(content).not.toContain("private calculateDepth(");
    expect(content).not.toContain("private analyzeNodeModules(");
  });
});
