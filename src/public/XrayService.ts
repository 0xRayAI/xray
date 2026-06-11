import { frameworkLogger } from "../core/framework-logger.js";
import { beforeToolHook, afterToolHook } from "../integrations/enforcement-gate.js";
import type { BeforeHookResult, AfterHookResult, GateViolation } from "../integrations/enforcement-gate.js";

export interface XrayServiceConfig {
  enabled?: boolean;
  strictMode?: boolean;
  logLevel?: string;
}

const defaultConfig: XrayServiceConfig = {
  enabled: true,
  strictMode: false,
  logLevel: "info",
};

export class XrayService {
  private config: XrayServiceConfig;
  private initialized = false;

  constructor(config?: XrayServiceConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await frameworkLogger.log("XrayService", "init", "info", {
      message: "XrayService initialized",
      config: this.config,
    });
    this.initialized = true;
  }

  async beforeTool(tool: string, args: Record<string, unknown> | null, context?: { directory?: string }): Promise<BeforeHookResult> {
    if (!this.config.enabled) {
      return { allowed: true, blocked: false, violations: [], resonance: 1, duration: 0 };
    }
    const gateCtx = context ? { ...(context.directory ? { directory: context.directory } : {}) } : undefined;
    return beforeToolHook(tool, args, gateCtx);
  }

  async afterTool(
    tool: string,
    args: Record<string, unknown> | null,
    result: unknown,
    error: string | null = null,
  ): Promise<AfterHookResult> {
    if (!this.config.enabled) {
      return { processed: false, violations: [], processorResults: [], governanceTriggered: false, duration: 0 };
    }
    return afterToolHook(tool, args, result, error);
  }

  shutdown(): void {
    this.initialized = false;
    frameworkLogger.log("XrayService", "shutdown", "info", { message: "XrayService shut down" });
  }
}
