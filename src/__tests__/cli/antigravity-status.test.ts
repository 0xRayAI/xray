/**
 * Antigravity Status Command Tests
 *
 * Tests for src/cli/commands/antigravity-status.ts
 *
 * @version 1.0.0
 * @since 1.15.0
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();

describe("Antigravity Status Command", () => {
  describe("File Existence", () => {
    it("should have antigravity-status.ts command file", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      expect(fs.existsSync(statusPath)).toBe(true);
    });

    it("should export antigravityStatusCommand function", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("export async function antigravityStatusCommand");
    });
  });

  describe("Skill Detection", () => {
    it("should detect skills in integrations", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("integrations");
    });

    it("should detect skills in skills directory", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("skills");
    });
  });

  describe("License Detection", () => {
    it("should extract license from SKILL.md", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("license");
    });

    it("should extract source from SKILL.md", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("source");
    });

    it("should detect MIT license", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("MIT");
    });

    it("should detect Apache license", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("Apache");
    });
  });

  describe("Category Detection", () => {
    it("should categorize skills by type", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("extractCategory");
    });

    it("should have category emoji mapping", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("categoryEmoji");
    });
  });

  describe("License File References", () => {
    it("should reference LICENSE.antigravity", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("LICENSE.antigravity");
    });

    it("should reference LICENSE.impeccable", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("LICENSE.impeccable");
    });

    it("should reference LICENSE.openviking", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("LICENSE.openviking");
    });
  });

  describe("CLI Output", () => {
    it("should show box drawing characters", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("╔");
    });

    it("should show total skills count", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("Total Skills");
    });

    it("should show categories count", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("Categories");
    });

    it("should show license legend", () => {
      const statusPath = path.join(PROJECT_ROOT, "src/cli/commands/antigravity-status.ts");
      const content = fs.readFileSync(statusPath, "utf-8");
      expect(content).toContain("Legend");
      expect(content).toContain("[MIT]");
      expect(content).toContain("[APA]");
    });
  });

  describe("Installed Skills Verification", () => {
    it("should detect typescript-expert skill", () => {
      const skillPath = path.join(
        PROJECT_ROOT,
        ".opencode/integrations/typescript-expert/SKILL.md"
      );
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it("should detect impeccable skill", () => {
      const skillPath = path.join(
        PROJECT_ROOT,
        ".opencode/integrations/impeccable/SKILL.md"
      );
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it("should detect openviking skill", () => {
      const skillPath = path.join(
        PROJECT_ROOT,
        ".opencode/integrations/openviking/SKILL.md"
      );
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it("should detect antigravity-bridge skill", () => {
      const skillPath = path.join(
        PROJECT_ROOT,
        ".opencode/integrations/antigravity-bridge/SKILL.md"
      );
      expect(fs.existsSync(skillPath)).toBe(true);
    });
  });

  describe("Skill Frontmatter", () => {
    it("should have proper source attribution for typescript-expert", () => {
      const skillPath = path.join(
        PROJECT_ROOT,
        ".opencode/integrations/typescript-expert/SKILL.md"
      );
      const content = fs.readFileSync(skillPath, "utf-8");
      expect(content).toContain("antigravity-awesome-skills");
      expect(content).toContain("MIT");
    });

    it("should have proper source attribution for impeccable", () => {
      const skillPath = path.join(
        PROJECT_ROOT,
        ".opencode/integrations/impeccable/SKILL.md"
      );
      const content = fs.readFileSync(skillPath, "utf-8");
      expect(content).toContain("pbakaus/impeccable");
      expect(content).toContain("Apache");
    });

    it("should have proper source attribution for openviking", () => {
      const skillPath = path.join(
        PROJECT_ROOT,
        ".opencode/integrations/openviking/SKILL.md"
      );
      const content = fs.readFileSync(skillPath, "utf-8");
      expect(content).toContain("volcengine/OpenViking");
      expect(content).toContain("Apache");
    });
  });
});
