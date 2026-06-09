import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProcessorManager } from "../../processors/processor-manager.js";
import { XrayStateManager } from "../../state/state-manager.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import * as fs from "fs";
import * as path from "path";

describe("Processor ↔ frameworkLogger Integration", () => {
  let stateManager: XrayStateManager;

  beforeEach(() => {
    stateManager = new XrayStateManager("/tmp/test-processor-logger");
  });

  afterEach(() => {
    const logDir = path.join(process.cwd(), "logs", "framework");
    const logFile = path.join(logDir, "activity.log");
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    if (fs.existsSync(logDir)) {
      const entries = fs.readdirSync(logDir);
      if (entries.length === 0) {
        fs.rmdirSync(logDir);
      }
    }
  });

  it("logs processor registration via frameworkLogger.log", () => {
    const spy = vi.spyOn(frameworkLogger, "log");
    const manager = new ProcessorManager(stateManager);

    manager.registerProcessor({
      name: "integrationTestProcessor",
      type: "pre",
      priority: 10,
      enabled: true,
    });

    expect(spy).toHaveBeenCalledWith(
      "processor-manager",
      "processor registered",
      "success",
      expect.objectContaining({
        name: "integrationTestProcessor",
        type: "pre",
      }),
    );

    spy.mockRestore();
  });

  it("writes activity.log when a processor registers", async () => {
    const manager = new ProcessorManager(stateManager);

    manager.registerProcessor({
      name: "integrationTestProcessor",
      type: "post",
      priority: 20,
      enabled: true,
    });

    const logFile = path.join(process.cwd(), "logs", "framework", "activity.log");

    let found = false;
    for (let i = 0; i < 30; i++) {
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, "utf-8");
        if (content.includes("processor registered")) {
          found = true;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    expect(found).toBe(true);
  });

  it("includes correct component/action/status fields in log entry", () => {
    const spy = vi.spyOn(frameworkLogger, "log");
    const manager = new ProcessorManager(stateManager);

    manager.registerProcessor({
      name: "integrationTestProcessor",
      type: "pre",
      priority: 10,
      enabled: true,
    });

    const registrationCall = spy.mock.calls.find(
      (args) => args[1] === "processor registered",
    );
    expect(registrationCall).toBeDefined();
    expect(registrationCall![0]).toBe("processor-manager");
    expect(registrationCall![1]).toBe("processor registered");
    expect(registrationCall![2]).toBe("success");

    spy.mockRestore();
  });
});
