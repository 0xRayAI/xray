import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Processor Registration Verification", () => {
  const bootOrchestratorPath = path.join(
    process.cwd(),
    "src/core/boot-orchestrator.ts",
  );
  const content = fs.readFileSync(bootOrchestratorPath, "utf-8");

  it("should register nudge processor in PROCESSOR_DEFS", () => {
    expect(content).toContain('name: "nudge"');
    expect(content).toContain('name: "nudge", type: "post"');
  });

  it("should register commitBatcher processor in PROCESSOR_DEFS", () => {
    expect(content).toContain('name: "commitBatcher"');
    expect(content).toContain('name: "commitBatcher", type: "post"');
  });
});

describe("Processor Factory Registration", () => {
  const processorManagerPath = path.join(
    process.cwd(),
    "src/processors/processor-manager.ts",
  );
  const content = fs.readFileSync(processorManagerPath, "utf-8");

  it("should register nudge factory in registerBuiltInFactories", () => {
    expect(content).toContain('name: "nudge"');
    expect(content).toContain('import("./implementations/nudge-processor.js")');
  });

  it("should register commitBatcher factory in registerBuiltInFactories", () => {
    expect(content).toContain('name: "commitBatcher"');
    expect(content).toContain('import("./implementations/commit-batcher-processor.js")');
  });
});
