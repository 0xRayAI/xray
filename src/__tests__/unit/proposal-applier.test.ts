import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSpawnSync, mockExistsSync, mockMkdirSync, mockWriteFileSync, mockAppendFileSync, mockReadFileSync, mockPathJoin, mockPathDirname, mockPathRelative } = vi.hoisted(() => {
  const mockPathJoin = vi.fn((...args: string[]) => args.join("/"));
  const mockPathDirname = vi.fn((p: string) => {
    const idx = p.lastIndexOf("/");
    return idx >= 0 ? p.substring(0, idx) || "/" : ".";
  });
  const mockPathRelative = vi.fn((from: string, to: string) => {
    if (to.startsWith(from + "/")) return to.slice(from.length + 1);
    if (to.startsWith(from)) return to.slice(from.length);
    return to;
  });
  return {
    mockSpawnSync: vi.fn(),
    mockExistsSync: vi.fn(),
    mockMkdirSync: vi.fn(),
    mockWriteFileSync: vi.fn(),
    mockAppendFileSync: vi.fn(),
    mockReadFileSync: vi.fn(),
    mockPathJoin,
    mockPathDirname,
    mockPathRelative,
  };
});

vi.mock("child_process", () => ({ spawnSync: mockSpawnSync }));

vi.mock("fs", () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  appendFileSync: mockAppendFileSync,
  readFileSync: mockReadFileSync,
}));

vi.mock("path", () => ({
  default: { join: mockPathJoin, dirname: mockPathDirname, relative: mockPathRelative },
  join: mockPathJoin,
  dirname: mockPathDirname,
  relative: mockPathRelative,
}));

vi.mock("../../core/framework-logger.js", () => ({
  frameworkLogger: { log: vi.fn() },
}));

import { ProposalApplier } from "../../execution/proposal-applier.js";
import type { InferenceProposal } from "../../inference/inference-cycle.js";

describe("ProposalApplier", () => {
  const projectRoot = "/tmp/test-project";

  const sampleProposal: InferenceProposal = {
    id: "test-prop-1",
    type: "fix",
    title: "Fix null pointer in user service",
    description: "Fix recurring null pointer dereference in UserService.getUser()",
    evidence: ["Seen in session abc123"],
    confidence: 0.85,
    source: "recurring_problem",
    status: "approved",
  };

  const secondProposal: InferenceProposal = {
    id: "test-prop-2",
    type: "refactor",
    title: "Extract validation logic",
    description: "Extract inline validation into reusable module",
    evidence: ["Detected pattern across 3 sessions"],
    confidence: 0.75,
    source: "recurring_pattern",
    status: "approved",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args.includes('pr') && args.includes('create')) {
        return { status: 0, stdout: 'https://github.com/owner/repo/pull/1\n', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });
    mockExistsSync.mockReturnValue(true);
    mockMkdirSync.mockReturnValue(undefined);
  });

  it("standalone mode — creates marker file, returns success", async () => {
    const applier = new ProposalApplier(projectRoot);
    const results = await applier.applyProposals([sampleProposal]);

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockSpawnSync).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].proposalId).toBe("test-prop-1");
  });

  it("code change callback — success — creates branch, calls callback, commits, returns success", async () => {
    const codeChangeCallback = vi.fn().mockResolvedValue(true);
    const applier = new ProposalApplier(projectRoot, codeChangeCallback);
    const results = await applier.applyProposals([sampleProposal]);

    expect(codeChangeCallback).toHaveBeenCalledTimes(1);
    expect(codeChangeCallback).toHaveBeenCalledWith(sampleProposal);
    expect(mockSpawnSync).toHaveBeenCalled();
    expect(results[0].success).toBe(true);
  });

  it("code change callback — returns false — no changes, cleans up branch", async () => {
    const codeChangeCallback = vi.fn().mockResolvedValue(false);
    const applier = new ProposalApplier(projectRoot, codeChangeCallback);
    const results = await applier.applyProposals([sampleProposal]);

    expect(codeChangeCallback).toHaveBeenCalledTimes(1);
    expect(codeChangeCallback).toHaveBeenCalledWith(sampleProposal);
    expect(mockSpawnSync).toHaveBeenCalled();
    expect(results[0].success).toBe(false);
  });

  it("review callback — approves — after PR creation, review returns go", async () => {
    const codeChangeCallback = vi.fn().mockResolvedValue(true);
    const reviewCallback = vi.fn().mockResolvedValue("go" as const);
    const applier = new ProposalApplier(projectRoot, codeChangeCallback, reviewCallback);
    const results = await applier.applyProposals([sampleProposal]);

    expect(reviewCallback).toHaveBeenCalledTimes(1);
    expect(reviewCallback).toHaveBeenCalledWith(
      sampleProposal,
      expect.stringContaining("github.com"),
    );
    expect(results[0].success).toBe(true);
  });

  it("review callback — rejects — after PR creation, review returns no-go", async () => {
    const codeChangeCallback = vi.fn().mockResolvedValue(true);
    const reviewCallback = vi.fn().mockResolvedValue("no-go" as const);
    const applier = new ProposalApplier(projectRoot, codeChangeCallback, reviewCallback);
    const results = await applier.applyProposals([sampleProposal]);

    expect(reviewCallback).toHaveBeenCalledTimes(1);
    expect(mockSpawnSync).toHaveBeenCalled();
    expect(results[0].success).toBe(false);
  });

  it("codify type — handled directly without callbacks", async () => {
    const codifyProposal: InferenceProposal = {
      ...sampleProposal,
      id: "codify-prop-1",
      type: "codify",
      title: "Codify code review pattern",
    };
    const applier = new ProposalApplier(projectRoot);
    const results = await applier.applyProposals([codifyProposal]);

    expect(mockAppendFileSync).toHaveBeenCalledTimes(1);
    expect(mockAppendFileSync).toHaveBeenCalledWith(
      expect.stringContaining("pattern-catalog.md"),
      expect.any(String),
    );
    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(results[0].success).toBe(true);
    expect(results[0].proposalId).toBe("codify-prop-1");
  });

  it("error during git — catch block handles cleanup", async () => {
    mockSpawnSync.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args.includes('checkout') && args.includes('-b')) {
        return { status: 1, stdout: '', stderr: 'mock git error' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    const applier = new ProposalApplier(projectRoot);
    const results = await applier.applyProposals([sampleProposal]);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("mock git error");
  });

  it("multiple proposals — processes all", async () => {
    const applier = new ProposalApplier(projectRoot);
    const results = await applier.applyProposals([sampleProposal, secondProposal]);

    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });
});
