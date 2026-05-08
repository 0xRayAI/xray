import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../core/framework-logger.js", () => ({
  frameworkLogger: { log: vi.fn() },
}));

import { CommitBatcherProcessor, executeCommitBatcherProcessor } from
  "../../processors/implementations/commit-batcher-processor.js";

describe("CommitBatcherProcessor", () => {
  let processor: CommitBatcherProcessor;
  let mockAddChange: ReturnType<typeof vi.fn>;
  let mockCommitBatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddChange = vi.fn();
    mockCommitBatch = vi.fn();
    processor = new CommitBatcherProcessor({
      addChange: mockAddChange,
      commitBatch: mockCommitBatch,
    } as any);
  });

  it("should have name='commitBatcher' and priority=85", () => {
    expect(processor.name).toBe("commitBatcher");
    expect(processor.priority).toBe(85);
  });

  it("should extend PostProcessor (type='post')", () => {
    expect(processor.type).toBe("post");
  });

  it("should skip non-file-modifying tools", async () => {
    const result = await processor.execute({ tool: "read", operation: "read" });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("batched", false);
    expect(data).toHaveProperty("reason", "Not a file-modifying tool");
    expect(mockAddChange).not.toHaveBeenCalled();
  });

  it("should skip when no filePath", async () => {
    const result = await processor.execute({ tool: "edit", operation: "edit" });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("batched", false);
    expect(data).toHaveProperty("reason", "No file path");
  });

  it("should call addChange for file-modifying tools with filePath", async () => {
    mockAddChange.mockReturnValue(false);

    const result = await processor.execute({
      tool: "edit",
      operation: "edit",
      filePath: "src/test.ts",
    });

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("batched", false);
    expect(data).toHaveProperty("pendingCount", 1);
    expect(mockAddChange).toHaveBeenCalledTimes(1);
    expect(mockAddChange).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: "src/test.ts", operation: "edit" }),
    );
  });

  it("should trigger commitBatch when addChange returns true", async () => {
    mockAddChange.mockReturnValue(true);
    mockCommitBatch.mockResolvedValue({ committed: true, message: "test" });

    const result = await processor.execute({
      tool: "edit",
      operation: "edit",
      filePath: "src/test.ts",
    });

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("batched", true);
    expect(mockCommitBatch).toHaveBeenCalledTimes(1);
  });

  it("should infer feature changeType for create tool", async () => {
    mockAddChange.mockReturnValue(false);

    await processor.execute({
      tool: "create",
      operation: "create",
      filePath: "src/new-feature.ts",
    });

    expect(mockAddChange).toHaveBeenCalledWith(
      expect.objectContaining({ changeType: "feature" }),
    );
  });

  it("should infer test changeType for test files", async () => {
    mockAddChange.mockReturnValue(false);

    await processor.execute({
      tool: "edit",
      operation: "edit",
      filePath: "src/__tests__/my-test.test.ts",
    });

    expect(mockAddChange).toHaveBeenCalledWith(
      expect.objectContaining({ changeType: "test" }),
    );
  });
});

describe("executeCommitBatcherProcessor", () => {
  it("should create processor and execute without error", async () => {
    const result = await executeCommitBatcherProcessor({
      tool: "read",
      filePath: "src/test.ts",
    } as any);

    expect(result.success).toBe(true);
  });
});
