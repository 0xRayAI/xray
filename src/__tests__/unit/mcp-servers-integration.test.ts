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

  it("should have multimodal-looker server file", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/knowledge-skills/multimodal-looker.server.ts",
    );
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  it("should have analyzer server file", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/knowledge-skills/analyzer.server.ts",
    );
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  it("should have seo-specialist server file", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/knowledge-skills/seo-specialist.server.ts",
    );
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  it("should have marketing-expert server file", () => {
    const serverPath = path.join(
      process.cwd(),
      "src/mcps/knowledge-skills/marketing-expert.server.ts",
    );
    expect(fs.existsSync(serverPath)).toBe(true);
  });
});

describe("Antigravity Skills Integration", () => {
  it("should have Antigravity integration script", () => {
    // Check for both .js and .mjs extensions (ESM scripts use .mjs)
    const scriptPath = path.join(
      process.cwd(),
      "scripts/integrations/install-antigravity-skills.js",
    );
    const scriptPathMjs = path.join(
      process.cwd(),
      "scripts/integrations/install-antigravity-skills.js.mjs",
    );
    expect(fs.existsSync(scriptPath) || fs.existsSync(scriptPathMjs)).toBe(
      true,
    );
  });

  it("should have Antigravity documentation", () => {
    const docPath = path.join(process.cwd(), "docs/ANTIGRAVITY_INTEGRATION.md");
    expect(fs.existsSync(docPath)).toBe(true);
  });

  it("should have Antigravity license file", () => {
    const licensePath = path.join(process.cwd(), "LICENSE.antigravity");
    expect(fs.existsSync(licensePath)).toBe(true);
  });

  it("should list curated skills in documentation", () => {
    const docPath = path.join(process.cwd(), "docs/ANTIGRAVITY_INTEGRATION.md");
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
    expect(content).toContain("Available Agents");
    expect(content).toContain("@enforcer");
  });
});

describe("MCP Client Configuration", () => {
  it("should have MCP client with new server configs", () => {
    const mcpPath = path.join(process.cwd(), "src/mcps/mcp-client.ts");
    expect(fs.existsSync(mcpPath)).toBe(true);
    const content = fs.readFileSync(mcpPath, "utf-8");

    // Check for new MCP configs
    expect(content).toContain("bug-triage-specialist");
    expect(content).toContain("log-monitor");
    expect(content).toContain("multimodal-looker");
    expect(content).toContain("analyzer");
  });
});
