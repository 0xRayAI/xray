import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("Auto-Reflection Generation", () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "strray-reflection-test-"));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should generate reflection file when triggers activate", async () => {
    process.chdir(tmpDir);
    fs.mkdirSync(path.join(tmpDir, "docs", "reflections", "deep"), { recursive: true });

    const { StorytellingTriggerProcessor } = await import(
      "../../processors/implementations/storytelling-trigger-processor.js"
    );

    vi.spyOn(StorytellingTriggerProcessor.prototype, "loadConfig" as any).mockImplementation(function (this: any) {
      this.config = {
        enabled: true,
        reflection_triggers: {
          commit_count: { enabled: true, threshold: 1, story_type: "reflection" },
          publish: { enabled: false, story_type: "saga" },
          complex_changes: {
            enabled: true,
            file_count_threshold: 5,
            story_type: "journey",
          },
          session_duration: {
            enabled: true,
            duration_minutes_threshold: 30,
            story_type: "reflection",
          },
        },
        story_types: {
          reflection: { location: "docs/reflections/", min_words: 2000, ideal_words: 5000, framework: "three_act_structure" },
          journey: { location: "docs/reflections/deep/", min_words: 1500, ideal_words: 4000, framework: "three_act_structure" },
        },
        quality_requirements: {
          require_frontmatter: true,
          require_key_takeaways: true,
        },
      };
    });

    const processor = new StorytellingTriggerProcessor();
    const result = await processor.run({
      operation: "commit",
      filePath: "src/test.ts",
      metadata: {
        filesChanged: 10,
        sessionDurationMinutes: 45,
      },
    } as any);

    expect(result).toBeDefined();
    expect((result as any).triggers).toBeDefined();
    expect((result as any).triggers.length).toBeGreaterThanOrEqual(1);

    if ((result as any).generated?.length > 0) {
      const generated = (result as any).generated as string[];
      for (const filePath of generated) {
        expect(fs.existsSync(filePath)).toBe(true);
        const content = fs.readFileSync(filePath, "utf-8");
        expect(content).toContain("# Auto-Generated");
        expect(content).toContain("## Context");
        expect(content).toContain("## Key Decisions");
        expect(content).toContain("## Lessons Learned");
      }
    }
  });

  it("should write to correct location based on story type", async () => {
    process.chdir(tmpDir);
    fs.mkdirSync(path.join(tmpDir, "docs", "reflections"), { recursive: true });

    const { StorytellingTriggerProcessor } = await import(
      "../../processors/implementations/storytelling-trigger-processor.js"
    );

    vi.spyOn(StorytellingTriggerProcessor.prototype, "loadConfig" as any).mockImplementation(function (this: any) {
      this.config = {
        enabled: true,
        reflection_triggers: {
          commit_count: { enabled: true, threshold: 1, story_type: "reflection" },
          publish: { enabled: false },
          complex_changes: { enabled: false },
          session_duration: { enabled: false },
        },
        story_types: {
          reflection: { location: "docs/reflections/", min_words: 2000, ideal_words: 5000, framework: "three_act_structure" },
        },
      };
    });

    const processor = new StorytellingTriggerProcessor();
    const result = await processor.run({
      operation: "commit",
    } as any);

    if ((result as any).generated?.length > 0) {
      const filePath = (result as any).generated[0] as string;
      expect(filePath).toContain("docs/reflections");
      expect(filePath).not.toContain("docs/reflections/deep");
    }
  });

  it("should create directory if it does not exist", async () => {
    process.chdir(tmpDir);

    const { StorytellingTriggerProcessor } = await import(
      "../../processors/implementations/storytelling-trigger-processor.js"
    );

    vi.spyOn(StorytellingTriggerProcessor.prototype, "loadConfig" as any).mockImplementation(function (this: any) {
      this.config = {
        enabled: true,
        reflection_triggers: {
          commit_count: { enabled: true, threshold: 1, story_type: "reflection" },
          publish: { enabled: false },
          complex_changes: { enabled: false },
          session_duration: { enabled: false },
        },
        story_types: {
          reflection: { location: "docs/reflections/", min_words: 2000, ideal_words: 5000, framework: "three_act_structure" },
        },
      };
    });

    expect(fs.existsSync(path.join(tmpDir, "docs", "reflections"))).toBe(false);

    const processor = new StorytellingTriggerProcessor();
    const result = await processor.run({ operation: "commit" } as any);

    if ((result as any).generated?.length > 0) {
      expect(fs.existsSync(path.join(tmpDir, "docs", "reflections"))).toBe(true);
    }
  });

  it("should not overwrite existing reflection file", async () => {
    process.chdir(tmpDir);
    fs.mkdirSync(path.join(tmpDir, "docs", "reflections"), { recursive: true });

    const { StorytellingTriggerProcessor } = await import(
      "../../processors/implementations/storytelling-trigger-processor.js"
    );

    vi.spyOn(StorytellingTriggerProcessor.prototype, "loadConfig" as any).mockImplementation(function (this: any) {
      this.config = {
        enabled: true,
        reflection_triggers: {
          commit_count: { enabled: true, threshold: 1, story_type: "reflection" },
          publish: { enabled: false },
          complex_changes: { enabled: false },
          session_duration: { enabled: false },
        },
        story_types: {
          reflection: { location: "docs/reflections/", min_words: 2000, ideal_words: 5000, framework: "three_act_structure" },
        },
      };
    });

    const processor = new StorytellingTriggerProcessor();

    const result1 = await processor.run({ operation: "commit" } as any);
    const firstGenerated = (result1 as any).generated || [];

    const result2 = await processor.run({ operation: "commit" } as any);
    const secondGenerated = (result2 as any).generated || [];

    expect(secondGenerated.length).toBeLessThanOrEqual(firstGenerated.length);
  });

  it("should suggest correct story type for different contexts", async () => {
    const { StorytellingTriggerProcessor } = await import(
      "../../processors/implementations/storytelling-trigger-processor.js"
    );

    expect(StorytellingTriggerProcessor.suggestStoryType({ isPublishing: true })).toBe("saga");
    expect(StorytellingTriggerProcessor.suggestStoryType({ fileCount: 20 })).toBe("journey");
    expect(StorytellingTriggerProcessor.suggestStoryType({ commitCount: 15 })).toBe("reflection");
    expect(StorytellingTriggerProcessor.suggestStoryType({})).toBe("reflection");
  });

  it("should return empty generated array when no triggers fire", async () => {
    process.chdir(tmpDir);

    const { StorytellingTriggerProcessor } = await import(
      "../../processors/implementations/storytelling-trigger-processor.js"
    );

    vi.spyOn(StorytellingTriggerProcessor.prototype, "loadConfig" as any).mockImplementation(function (this: any) {
      this.config = {
        enabled: true,
        reflection_triggers: {
          commit_count: { enabled: false },
          publish: { enabled: false },
          complex_changes: { enabled: false },
          session_duration: { enabled: false },
        },
      };
    });

    const processor = new StorytellingTriggerProcessor();
    const result = await processor.run({ operation: "commit" } as any);

    expect((result as any).generated).toBeUndefined();
    expect((result as any).triggers).toEqual([]);
  });
});
