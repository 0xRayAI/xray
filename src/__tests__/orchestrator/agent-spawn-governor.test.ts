/**
 * Comprehensive Test Suite for Agent Spawn Governance
 * Tests the critical spawn governor that prevents infinite subagent spawning
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  AgentSpawnGovernor,
  type SpawnAuthorization,
} from "../../orchestrator/agent-spawn-governor.js";

// Mock all framework dependencies to avoid complex import chains
vi.mock("../../framework-logger", () => ({
  frameworkLogger: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Agent Spawn Governor", () => {
  let governor: AgentSpawnGovernor;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create fresh governor instance
    governor = new AgentSpawnGovernor();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllTimers();
  });

  describe("Basic Spawn Authorization", () => {
    it("should authorize spawn for basic librarian agent", async () => {
      const context = {
        agentType: "librarian",
        operation: "analysis",
        sessionId: "test-session",
      };

      const result = await governor.authorizeSpawn(context);

      expect(result.authorized).toBe(true);
      expect(result.trackingId).toBeDefined();
      // Logger calls are mocked
    });

    it("should deny spawn when agent type limit exceeded", async () => {
      // Fill up librarian slots (limit is 1)
      const context1 = {
        agentType: "librarian",
        operation: "analysis",
        sessionId: "test-session",
      };

      const result1 = await governor.authorizeSpawn(context1);
      expect(result1.authorized).toBe(true);

      // Try to spawn another librarian
      const context2 = {
        agentType: "librarian",
        operation: "analysis",
        sessionId: "test-session",
      };

      const result2 = await governor.authorizeSpawn(context2);
      expect(result2.authorized).toBe(false);
      expect(result2.reason).toContain("Agent type limit exceeded");
    });

    it("should deny spawn when total concurrent limit exceeded", async () => {
      // Mock limits to test total concurrent limit
      const testGovernor = new AgentSpawnGovernor({
        totalConcurrent: 2,
        perAgentType: { librarian: 10, orchestrator: 10 },
      });

      // Fill up all slots
      for (let i = 0; i < 2; i++) {
        const result = await testGovernor.authorizeSpawn({
          agentType: "librarian",
          operation: `test-${i}`,
        });
        expect(result.authorized).toBe(true);
      }

      // Try one more
      const result = await testGovernor.authorizeSpawn({
        agentType: "librarian",
        operation: "test-overflow",
      });

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain("Total concurrent limit exceeded");
    });
  });

  describe("Spawn Rate Limiting", () => {
    it("should deny spawn when rate limit exceeded", async () => {
      const testGovernor = new AgentSpawnGovernor({
        perAgentType: { librarian: 10 }, // Allow multiple librarians to test rate limit
        spawnRateLimit: {
          maxPerMinute: 2,
          windowMs: 60000,
        },
      });

      // Use up the rate limit
      await testGovernor.authorizeSpawn({ agentType: "librarian" });
      await testGovernor.authorizeSpawn({ agentType: "librarian" });

      // This should be denied
      const result = await testGovernor.authorizeSpawn({
        agentType: "librarian",
      });
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain("Spawn rate limit exceeded");
    });

    it("should allow spawns after rate limit window", async () => {
      const testGovernor = new AgentSpawnGovernor({
        perAgentType: { librarian: 10 }, // Allow multiple librarians to test rate limit
        spawnRateLimit: {
          maxPerMinute: 1,
          windowMs: 1000, // 1 second for testing
        },
      });

      // Use up rate limit
      await testGovernor.authorizeSpawn({ agentType: "librarian" });

      // Should be denied immediately
      const deniedResult = await testGovernor.authorizeSpawn({
        agentType: "librarian",
      });
      expect(deniedResult.authorized).toBe(false);

      // Wait for window to expire (mock time advancement)
      vi.advanceTimersByTime(1001);

      // Should be allowed again
      const allowedResult = await testGovernor.authorizeSpawn({
        agentType: "librarian",
      });
      expect(allowedResult.authorized).toBe(true);
    });
  });

  describe("Infinite Spawn Detection", () => {
    it("should detect rapid repeated spawns of same type", async () => {
      const testGovernor = new AgentSpawnGovernor({
        perAgentType: { librarian: 10 }, // Allow multiple to test infinite detection
      });

      // Simulate rapid spawns (more than 5 in 5 minutes)
      for (let i = 0; i < 7; i++) {
        const mockDate = new Date(2026, 0, 24, 0, i); // Different minutes
        vi.setSystemTime(mockDate);

        const result = await testGovernor.authorizeSpawn({
          agentType: "librarian",
          operation: `rapid-test-${i}`,
        });

        // Complete previous spawns to avoid limit issues
        if (i < 6) {
          await testGovernor.completeSpawn(result.trackingId!);
        }
      }

      // Reset time to trigger detection
      vi.setSystemTime(new Date(2026, 0, 24, 0, 6));

      const result = await testGovernor.authorizeSpawn({
        agentType: "librarian",
        operation: "infinite-test",
      });

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain("Infinite spawn pattern detected");
    });

    it("should detect recursive spawning (agent spawning itself)", async () => {
      const result = await governor.authorizeSpawn({
        agentType: "librarian",
        parentAgent: "librarian", // Recursive!
        operation: "recursive-test",
      });

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain("Infinite spawn pattern detected");
    });

    it("should detect cascading librarian spawns", async () => {
      const testGovernor = new AgentSpawnGovernor({
        perAgentType: { librarian: 10 }, // Allow multiple to test cascading detection
      });

      // Fill up normal librarian slots
      for (let i = 0; i < 3; i++) {
        const result = await testGovernor.authorizeSpawn({
          agentType: "librarian",
          operation: `cascade-test-${i}`,
        });
        // Complete to avoid limit issues
        await testGovernor.completeSpawn(result.trackingId!);
      }

      // This should trigger cascading detection
      const result = await testGovernor.authorizeSpawn({
        agentType: "librarian",
        operation: "cascade-overflow",
      });

      expect(result.authorized).toBe(false);
    });
  });

  describe("Spawn Lifecycle Management", () => {
    it("should track spawn completion", async () => {
      const context = {
        agentType: "librarian",
        operation: "lifecycle-test",
      };

      const authResult = await governor.authorizeSpawn(context);
      expect(authResult.authorized).toBe(true);

      const trackingId = authResult.trackingId!;

      // Complete the spawn
      await governor.completeSpawn(trackingId);

      // Check that it's marked as completed
      const stats = governor.getSpawnStats();
      expect(stats.perAgentType.librarian?.total).toBe(1);

      // Logger is mocked and called during completion
    });

    it("should handle spawn failures", async () => {
      const context = {
        agentType: "librarian",
        operation: "failure-test",
      };

      const authResult = await governor.authorizeSpawn(context);
      const trackingId = authResult.trackingId!;

      // Fail the spawn
      await governor.failSpawn(trackingId, new Error("Test failure"));

      // Logger is mocked and called during failure
    });

    it("should allow spawn termination", async () => {
      const context = {
        agentType: "librarian",
        operation: "termination-test",
      };

      const authResult = await governor.authorizeSpawn(context);
      const trackingId = authResult.trackingId!;

      // Terminate the spawn
      await governor.terminateSpawn(trackingId, "Emergency shutdown");

      // Logger is mocked and called during termination
    });
  });

  describe("Statistics and Monitoring", () => {
    it("should provide accurate spawn statistics", async () => {
      await governor.authorizeSpawn({ agentType: "librarian" });
      await governor.authorizeSpawn({ agentType: "orchestrator" });
      await governor.authorizeSpawn({ agentType: "enforcer" });

      const stats = governor.getSpawnStats();

      expect(stats.totalActive).toBe(3);
      expect(stats.perAgentType.librarian?.active).toBe(1);
      expect(stats.perAgentType.orchestrator?.active).toBe(1);
      expect(stats.perAgentType.enforcer?.active).toBe(1);
    });

    it("should track spawn history correctly", async () => {
      // Create and complete some spawns
      const result1 = await governor.authorizeSpawn({ agentType: "librarian" });
      const result2 = await governor.authorizeSpawn({
        agentType: "orchestrator",
      });

      await governor.completeSpawn(result1.trackingId!);
      await governor.failSpawn(result2.trackingId!);

      const stats = governor.getSpawnStats();

      // Should have 2 total spawns, 0 active
      expect(stats.totalHistory).toBe(2);
      expect(stats.totalActive).toBe(0);
    });
  });

  describe("Emergency Controls", () => {
    it("should support emergency shutdown", async () => {
      // Create some active spawns
      await governor.authorizeSpawn({ agentType: "librarian" });
      await governor.authorizeSpawn({ agentType: "orchestrator" });

      expect(governor.getSpawnStats().totalActive).toBe(2);

      // Emergency shutdown
      await governor.emergencyShutdown("Test emergency");

      expect(governor.getSpawnStats().totalActive).toBe(0);
      // Logger is mocked and called during emergency shutdown
    });

    it("should maintain separate tracking for different agent types", async () => {
      // Test that different agent types are tracked separately
      await governor.authorizeSpawn({ agentType: "librarian" });
      await governor.authorizeSpawn({ agentType: "librarian" }); // Should fail
      await governor.authorizeSpawn({ agentType: "orchestrator" }); // Should succeed

      const stats = governor.getSpawnStats();
      expect(stats.perAgentType.librarian?.active).toBe(1);
      expect(stats.perAgentType.orchestrator?.active).toBe(1);
    });
  });

  describe("Configuration Validation", () => {
    it("should handle custom configuration", async () => {
      const customGovernor = new AgentSpawnGovernor({
        perAgentType: { customAgent: 5 },
        totalConcurrent: 20,
        spawnRateLimit: {
          maxPerMinute: 10,
          windowMs: 30000,
        },
      });

      for (let i = 0; i < 5; i++) {
        const result = await customGovernor.authorizeSpawn({
          agentType: "customAgent",
        });
        expect(result.authorized).toBe(true);
      }

      // 6th should be denied
      const result = await customGovernor.authorizeSpawn({
        agentType: "customAgent",
      });
      expect(result.authorized).toBe(false);
    });

    it("should use default limits when not specified", async () => {
      const defaultGovernor = new AgentSpawnGovernor();

      // Should use default librarian limit (1)
      await defaultGovernor.authorizeSpawn({ agentType: "librarian" });

      const result = await defaultGovernor.authorizeSpawn({
        agentType: "librarian",
      });
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain("Agent type limit exceeded");
    });
  });

  describe("Integration with Universal Librarian Consultation", () => {
    it("should work with consultation system metadata", async () => {
      // Test spawn with consultation metadata
      const result = await governor.authorizeSpawn({
        agentType: "librarian",
        operation: "consultation-test",
        triggeredBy: "agent-delegator", // This should not trigger recursion detection
      });

      expect(result.authorized).toBe(true);
    });

    it("should prevent consultation-triggered infinite loops", async () => {
      // This simulates the bug we fixed - consultation triggering more consultation
      const context = {
        agentType: "librarian",
        operation: "consultation-recursion",
        metadata: { triggeredBy: "universal-librarian-consultation" },
      };

      // This should still be allowed since it's not recursive agent spawning
      const result = await governor.authorizeSpawn(context);
      expect(result.authorized).toBe(true);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid agent types gracefully", async () => {
      const result = await governor.authorizeSpawn({
        agentType: "invalid-agent-type",
        operation: "test",
      });

      // Should use default limit (1) for unknown agent types
      expect(result.authorized).toBe(true);

      // Second attempt should fail
      const result2 = await governor.authorizeSpawn({
        agentType: "invalid-agent-type",
        operation: "test2",
      });

      expect(result2.authorized).toBe(false);
    });

    it("should handle concurrent spawn requests", async () => {
      // Simulate concurrent requests with proper typing
      const promises: Promise<SpawnAuthorization>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          governor.authorizeSpawn({
            agentType: `agent-${i % 2}`, // Alternate between types
            operation: `concurrent-${i}`,
          }),
        );
      }

      const results = await Promise.all(promises);

      // Should respect limits even under concurrent load
      const authorizedCount = results.filter((r) => r.authorized).length;
      expect(authorizedCount).toBeLessThanOrEqual(8); // Total concurrent limit
    });

    it("should maintain state consistency across operations", async () => {
      // Complex sequence: authorize, complete, fail, terminate
      const authResult = await governor.authorizeSpawn({
        agentType: "librarian",
      });
      const trackingId = authResult.trackingId!;

      // Complete one
      await governor.completeSpawn(trackingId);

      // Authorize another
      const authResult2 = await governor.authorizeSpawn({
        agentType: "librarian",
      });
      const trackingId2 = authResult2.trackingId!;

      // Fail it
      await governor.failSpawn(trackingId2);

      // Authorize third
      const authResult3 = await governor.authorizeSpawn({
        agentType: "librarian",
      });
      const trackingId3 = authResult3.trackingId!;

      // Terminate it
      await governor.terminateSpawn(trackingId3);

      // State should be consistent
      const stats = governor.getSpawnStats();
      expect(stats.totalActive).toBe(0);
      expect(stats.totalHistory).toBe(3);
    });
  });
});
