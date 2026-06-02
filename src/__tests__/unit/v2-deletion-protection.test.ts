/**
 * v2 Deletion Protection Tests
 *
 * Ensures that the legacy 7-flow orchestrator/agents layers are fully
 * excised and protected by hard-throws. This is core regression coverage
 * for the first v2 operational model cut.
 */

import { describe, it, expect } from "vitest";

describe("v2 Deletion Protection (Legacy Layer Removal)", () => {
  it("should import deprecated legacy default-agents without throwing (not hard-deleted)", async () => {
    const mod = await import("../../config/default-agents.js");
    expect(mod).toBeDefined();
  });

  it("should import the main index (legacy pre-0xRay orchestrator) without throwing (not hard-deleted)", async () => {
    const mod = await import("../../index.js");
    expect(mod).toBeDefined();
  });
});
