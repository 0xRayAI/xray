import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockExecSync = vi.fn();
const mockSpawn = vi.fn();
const mockFsExistsSync = vi.fn();
const mockGetAgentSpawn = vi.fn();
const mockAssertAllowed = vi.fn();
const mockAuthorizeSpawn = vi.fn();
const mockFailSpawn = vi.fn();
const mockCompleteSpawn = vi.fn();
const mockGetConfigDir = vi.fn();

vi.mock("child_process", () => ({
  execSync: mockExecSync,
  spawn: mockSpawn,
}));

vi.mock("fs", () => ({
  default: { existsSync: mockFsExistsSync },
  existsSync: mockFsExistsSync,
}));

vi.mock("path", () => ({
  default: {
    join: vi.fn((...a: string[]) => a.join("/")),
    dirname: vi.fn((p: string) => p.split("/").slice(0, -1).join("/") || "/"),
  },
  join: vi.fn((...a: string[]) => a.join("/")),
  dirname: vi.fn((p: string) => p.split("/").slice(0, -1).join("/") || "/"),
}));

vi.mock("../../core/framework-logger.js", () => ({
  frameworkLogger: { log: vi.fn() },
}));

vi.mock("../../core/features-config.js", () => ({
  getAgentSpawn: mockGetAgentSpawn,
}));

vi.mock("../../core/agent-spawn-gate.js", () => ({
  spawnGate: { assertAllowed: mockAssertAllowed },
}));

vi.mock("../../orchestrator/agent-spawn-governor.js", () => ({
  agentSpawnGovernor: {
    authorizeSpawn: mockAuthorizeSpawn,
    failSpawn: mockFailSpawn,
    completeSpawn: mockCompleteSpawn,
  },
}));

vi.mock("../../core/config-paths.js", () => ({
  getConfigDir: mockGetConfigDir,
}));

function makeMockSpawn() {
  const closeHandlers: Array<(code: number | null) => void> = [];
  return {
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event: string, handler: (code: number | null) => void) => {
      if (event === "close") closeHandlers.push(handler);
    }),
    kill: vi.fn(),
    // Helper to simulate close
    _emitClose: (code: number | null = 0) => {
      closeHandlers.forEach((h) => h(code));
    },
  };
}

describe("opencode-cli-invoker", () => {
  let invokeViaOpencode: typeof import("../../execution/opencode-cli-invoker.js").invokeViaOpencode;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import("../../execution/opencode-cli-invoker.js");
    invokeViaOpencode = mod.invokeViaOpencode;
    mockGetAgentSpawn.mockReturnValue({ enabled: true });
    mockAssertAllowed.mockReturnValue(undefined);
    mockAuthorizeSpawn.mockResolvedValue({ authorized: true, trackingId: "test-tracking-1" });
    mockFsExistsSync.mockReturnValue(true);
    mockGetConfigDir.mockReturnValue("/tmp/.opencode");
    mockExecSync.mockReturnValue("/usr/local/bin/opencode");
  });

  afterEach(() => {
    delete process.env.XRAY_FORCE_MCP_GOVERNANCE;
    delete ;
  });

  describe("XRAY_FORCE_MCP_GOVERNANCE guard", () => {
    it("throws when XRAY_FORCE_MCP_GOVERNANCE is true", async () => {
      process.env.XRAY_FORCE_MCP_GOVERNANCE = "true";
       = "true";
      await expect(invokeViaOpencode("architect", "test")).rejects.toThrow(
        `[PURE MCP] invokeViaOpencode called for "architect"`,
      );
    });
  });

  describe("test environment guard", () => {
    it("throws when NODE_ENV is test", async () => {
      process.env.NODE_ENV = "test";
      await expect(invokeViaOpencode("architect", "t")).rejects.toThrow(
        "Agent spawning is disabled in test environment",
      );
    });

    it("throws when VITEST is set", async () => {
      process.env.NODE_ENV = "development";
      process.env.VITEST = "true";
      await expect(invokeViaOpencode("architect", "t")).rejects.toThrow(
        "Agent spawning is disabled in test environment",
      );
    });
  });

  describe("spawnConfig guard", () => {
    it("throws when agent_spawn is disabled", async () => {
      mockGetAgentSpawn.mockReturnValue({ enabled: false });
      await expect(invokeViaOpencode("architect", "t")).rejects.toThrow(
        "Agent spawning is disabled in test environment",
      );
    });
  });

  describe("spawnGate guard", () => {
    it("throws when spawn gate blocks (gate checked before test env guard)", async () => {
      mockAssertAllowed.mockImplementation(() => {
        throw new Error("gate blocked");
      });
      // spawnGate.assertAllowed runs BEFORE the NODE_ENV/VITEST guard
      await expect(invokeViaOpencode("architect", "t")).rejects.toThrow("gate blocked");
    });
  });

  describe("agentSpawnGovernor integration", () => {
    it("throws when governor denies spawn", async () => {
      mockAuthorizeSpawn.mockResolvedValue({ authorized: false, reason: "rate limited" });
      vi.stubEnv("VITEST", "");
      vi.stubEnv("NODE_ENV", "development");
      await expect(invokeViaOpencode("architect", "t")).rejects.toThrow(
        'Spawn denied by governance for "architect": rate limited',
      );
      vi.unstubAllEnvs();
    });

    it("calls failSpawn when opencode not in PATH", async () => {
      mockExecSync.mockImplementation(() => { throw new Error("not found"); });
      vi.stubEnv("VITEST", "");
      vi.stubEnv("NODE_ENV", "development");
      await expect(invokeViaOpencode("architect", "t")).rejects.toThrow(
        "opencode CLI is not available",
      );
      expect(mockFailSpawn).toHaveBeenCalled();
      vi.unstubAllEnvs();
    });

    it("invokes authorizeSpawn with correct context", async () => {
      mockSpawn.mockReturnValue(makeMockSpawn());
      vi.stubEnv("VITEST", "");
      vi.stubEnv("NODE_ENV", "development");
      const p = invokeViaOpencode("code-reviewer", "review");
      expect(mockAuthorizeSpawn).toHaveBeenCalledWith({
        agentType: "code-reviewer",
        operation: "inference-cycle-invoke",
      });
      p.catch(() => {});
      vi.unstubAllEnvs();
    });
  });

  describe("path resolution", () => {
    it("passes projectRoot to getConfigDir", async () => {
      const mock = makeMockSpawn();
      mockSpawn.mockReturnValue(mock);
      vi.stubEnv("VITEST", "");
      vi.stubEnv("NODE_ENV", "development");
      const p = invokeViaOpencode("architect", "t", "/my/project");
      // getConfigDir is called after an await (in a microtask), so flush microtasks
      await new Promise((r) => setTimeout(r, 0));
      expect(mockGetConfigDir).toHaveBeenCalledWith("/my/project");
      p.catch(() => {});
      vi.unstubAllEnvs();
    });
  });
});
