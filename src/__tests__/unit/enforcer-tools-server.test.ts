/**
 * Tests for enforcer-tools.server.ts — CodexPolicyService delegation
 *
 * Verifies that getCodexTermCount() delegates to CodexPolicyService
 * instead of performing direct fs reads.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTermCount = vi.fn();

vi.mock("../../governance/codex-policy.service.js", () => ({
  getCodexPolicyService: vi.fn(() => ({
    getTermCount: mockGetTermCount,
  })),
}));

import StringRayEnforcerToolsServer from "../../mcps/enforcer-tools.server.js";

describe("StringRayEnforcerToolsServer - getCodexTermCount", () => {
  let server: InstanceType<typeof StringRayEnforcerToolsServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new StringRayEnforcerToolsServer();
  });

  it("should delegate to getCodexPolicyService().getTermCount()", async () => {
    mockGetTermCount.mockResolvedValue(60);

    const result = await (server as any).getCodexTermCount();

    expect(mockGetTermCount).toHaveBeenCalledTimes(1);
    expect(result).toBe(60);
  });

  it("should return 60 fallback when service throws", async () => {
    mockGetTermCount.mockRejectedValue(new Error("service unavailable"));

    const result = await (server as any).getCodexTermCount();

    expect(result).toBe(60);
  });

  it("should propagate the term count from the service", async () => {
    mockGetTermCount.mockResolvedValue(42);

    const result = await (server as any).getCodexTermCount();

    expect(result).toBe(42);
  });
});
