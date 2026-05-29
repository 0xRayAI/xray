/**
 * v2 Deletion Protection Tests
 *
 * Ensures that the legacy 7-flow orchestrator/agents layers are fully
 * excised and protected by hard-throws. This is core regression coverage
 * for the first v2 operational model cut.
 */

import { describe, it, expect } from "vitest";

describe("v2 Deletion Protection (Legacy Layer Removal)", () => {
  it("should hard-throw when importing deleted legacy default-agents", async () => {
    await expect(async () => {
      await import("../../config/default-agents.js");
    }).rejects.toThrow(/v2 DELETED.*three-subsystem skill-based surfaces/);
  });

  it("should hard-throw when importing the main index (legacy pre-0xRay orchestrator)", async () => {
    await expect(async () => {
      await import("../../index.js");
    }).rejects.toThrow(/v2 DELETED.*three-subsystem skill-based surfaces/);
  });
});
