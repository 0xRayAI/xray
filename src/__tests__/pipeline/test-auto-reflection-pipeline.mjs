/**
 * Auto-Reflection Pipeline Test
 * 
 * Tests the auto-reflection system including:
 * - Auto-reflection generator
 * - Post-commit hook integration
 * - features.json configuration loading
 * 
 * @version 1.0.0
 * @since 2026-04-04
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const TEST_REFLECTIONS_DIR = join(process.cwd(), "test-reflections-temp");

describe("Auto-Reflection Pipeline", () => {
  beforeEach(() => {
    // Create test directory
    if (!existsSync(TEST_REFLECTIONS_DIR)) {
      mkdirSync(TEST_REFLECTIONS_DIR, { recursive: true });
    }
  });
  
  afterEach(() => {
    // Cleanup test directory
    if (existsSync(TEST_REFLECTIONS_DIR)) {
      rmSync(TEST_REFLECTIONS_DIR, { recursive: true, force: true });
    }
  });
  
  describe("Auto-Reflection Generator CLI", () => {
    it("should generate reflection stub with manual trigger", () => {
      const output = execSync(
        `node scripts/node/auto-reflection-generator.mjs --trigger manual --title "Test Reflection" --force`,
        { encoding: "utf-8" }
      );
      
      expect(output).toContain("Reflection stub generated");
      expect(output).toContain("docs/reflections/auto-");
      
      // Check file was created
      const files = execSync("ls docs/reflections/auto-manual-*.md 2>/dev/null || echo ''", { encoding: "utf-8" });
      expect(files.trim().length).toBeGreaterThan(0);
    });
    
    it("should respect features.json mode settings", () => {
      // Test with minimal mode - should show mode in output
      const output = execSync(
        `REFLECTIONS_DIR=${TEST_REFLECTIONS_DIR} node scripts/node/auto-reflection-generator.mjs --trigger commit-threshold --force`,
        { encoding: "utf-8" }
      );
      
      expect(output).toContain("Auto-reflection mode:");
    });
    
    it("should not generate if thresholds not met (without --force)", () => {
      // Create a recent reflection file to prevent trigger
      const recentFile = join(TEST_REFLECTIONS_DIR, "recent-reflection.md");
      writeFileSync(recentFile, "# Recent Reflection\n\nTest content", "utf-8");
      
      const output = execSync(
        `REFLECTIONS_DIR=${TEST_REFLECTIONS_DIR} node scripts/node/auto-reflection-generator.mjs --trigger commit-threshold`,
        { encoding: "utf-8", cwd: process.cwd() }
      );
      
      // Should indicate no reflection needed
      expect(output).toContain("not needed yet");
    });
  });
  
  describe("Reflection Template", () => {
    it("should include all required sections in generated stub", () => {
      execSync(
        `REFLECTIONS_DIR=${TEST_REFLECTIONS_DIR} node scripts/node/auto-reflection-generator.mjs --trigger manual --title "Template Test" --force`,
        { encoding: "utf-8" }
      );
      
      const files = execSync(`ls ${TEST_REFLECTIONS_DIR}/auto-*.md`, { encoding: "utf-8" });
      const filename = files.trim().split("\n")[0];
      
      if (filename && existsSync(filename)) {
        const content = readFileSync(filename, "utf-8");
        
        // Check required sections
        expect(content).toContain("## 1. Executive Summary");
        expect(content).toContain("## 2. What Was / What Is / What Should Be");
        expect(content).toContain("## 3. INNER DIALOGUE");
        expect(content).toContain("## 4. Counterfactual Thinking");
        expect(content).toContain("## 5. Personal Journey");
        expect(content).toContain("## 6. Code Examples");
        expect(content).toContain("## 9. What Still Doesn't Work");
        expect(content).toContain("## 10. For Future AI");
      }
    });
    
    it("should include frontmatter with story_type", () => {
      execSync(
        `REFLECTIONS_DIR=${TEST_REFLECTIONS_DIR} node scripts/node/auto-reflection-generator.mjs --trigger manual --title "Frontmatter Test" --force`,
        { encoding: "utf-8" }
      );
      
      const files = execSync(`ls ${TEST_REFLECTIONS_DIR}/auto-*.md`, { encoding: "utf-8" });
      const filename = files.trim().split("\n")[0];
      
      if (filename && existsSync(filename)) {
        const content = readFileSync(filename, "utf-8");
        
        expect(content).toContain("---");
        expect(content).toContain("story_type:");
        expect(content).toContain("title:");
        expect(content).toContain("date:");
      }
    });
  });
  
  describe("Features.json Integration", () => {
    it("should load auto_reflection mode from features.json", () => {
      const featuresPath = join(process.cwd(), "xray/features.json");
      
      if (existsSync(featuresPath)) {
        const content = readFileSync(featuresPath, "utf-8");
        const config = JSON.parse(content);
        
        expect(config.auto_reflection).toBeDefined();
        expect(["full", "minimal", "off"]).toContain(config.auto_reflection.mode);
      }
    });
    
    it("should load processors config from features.json", () => {
      const featuresPath = join(process.cwd(), "xray/features.json");
      
      if (existsSync(featuresPath)) {
        const content = readFileSync(featuresPath, "utf-8");
        const config = JSON.parse(content);
        
        expect(config.processors).toBeDefined();
        expect(config.processors.pre_processors).toBeDefined();
        expect(config.processors.post_processors).toBeDefined();
      }
    });
    
    it("should load inference config from features.json", () => {
      const featuresPath = join(process.cwd(), "xray/features.json");
      
      if (existsSync(featuresPath)) {
        const content = readFileSync(featuresPath, "utf-8");
        const config = JSON.parse(content);
        
        expect(config.inference).toBeDefined();
        expect(config.inference.enabled).toBeDefined();
      }
    });
  });
  
  describe("Post-Commit Hook Integration", () => {
    it("should have post-commit hook configured", () => {
      const hookPath = join(process.cwd(), "hooks/post-commit");
      expect(existsSync(hookPath)).toBe(true);
    });
    
    it("should load config in post-commit hook", () => {
      const hookContent = readFileSync(join(process.cwd(), "hooks/post-commit"), "utf-8");
      
      // Check for key features
      expect(hookContent).toContain("features.json");
      expect(hookContent).toContain("auto_reflection");
      expect(hookContent).toContain("MODE");
    });
  });
  
  describe("CI Workflow Integration", () => {
    it("should have auto-reflection workflow", () => {
      const workflowPath = join(process.cwd(), ".github/workflows/auto-reflection.yml");
      expect(existsSync(workflowPath)).toBe(true);
    });
    
    it("should have reflection check in CI", () => {
      const ciPath = join(process.cwd(), ".github/workflows/ci.yml");
      const ciContent = readFileSync(ciPath, "utf-8");
      
      expect(ciContent).toContain("auto-reflection-generator");
    });
  });
});

describe("Reflection Processor Pipeline", () => {
  it("should have reflection-processor script", () => {
    const scriptPath = join(process.cwd(), "scripts/node/reflection-processor.cjs");
    expect(existsSync(scriptPath)).toBe(true);
  });
  
  it("should have reflection-validate script", () => {
    const scriptPath = join(process.cwd(), "scripts/node/reflection-validate.sh");
    expect(existsSync(scriptPath)).toBe(true);
  });
});

console.log("📍 Auto-Reflection Pipeline Test");
console.log("================================");
console.log("");
console.log("✅ All integration tests defined");
console.log("");
console.log("To run these tests:");
console.log("  npm test");
console.log("  npm run test:pipelines");
console.log("");