/**
 * Enforcement Gate — shared v3 pipeline entry point for TUI/CLI integration hooks.
 *
 * Provides beforeToolHook (early ValidatorRegistry + block decision) and
 * afterToolHook (post-tool v3 PostProcessor loop + governance routing) that
 * all four host integrations (OpenCode, Hermes, Grok, OpenClaw) call from
 * their programmatic hook surfaces (tool.execute.before/after, onPreToolCall,
 * PreToolUse, onToolBefore/onToolAfter).
 *
 * This is the canonical "how a TUI/CLI tool leverages v3 cleanly."
 *
 * @module integrations/enforcement-gate
 */

import { frameworkLogger } from "../core/framework-logger.js";
import type { RuleValidationContext } from "../enforcement/types.js";
import type { IValidatorRegistry } from "../enforcement/types.js";

// ── Public Types ───────────────────────────────────────────────

export interface GateViolation {
  ruleId: string;
  severity: string;
  message: string;
  suggestions?: string[];
}

export interface BeforeHookResult {
  allowed: boolean;
  blocked: boolean;
  violations: GateViolation[];
  resonance: number;
  duration: number;
}

export interface AfterHookResult {
  processed: boolean;
  violations: GateViolation[];
  processorResults: Array<{ name: string; success: boolean; error?: string }>;
  governanceTriggered: boolean;
  duration: number;
}

export interface GateContext {
  directory?: string;
  projectRoot?: string;
  sessionId?: string;
}

// ── Registry Cache ─────────────────────────────────────────────

function getGlobalRegistry(): IValidatorRegistry | null {
  if ((globalThis as any).xrayValidatorRegistry) {
    return (globalThis as any).xrayValidatorRegistry as IValidatorRegistry;
  }
  return null;
}

async function loadRegistry(): Promise<IValidatorRegistry | null> {
  const cached = getGlobalRegistry();
  if (cached) return cached;

  const candidatePaths = [
    () => import("../enforcement/validators/validator-registry.js"),
    () => import("../../node_modules/0xray/dist/enforcement/validators/validator-registry.js"),
  ];

  for (const load of candidatePaths) {
    try {
      const mod = await load();
      const registry = mod.globalValidatorRegistry as IValidatorRegistry;
      if (registry) {
        (globalThis as any).xrayValidatorRegistry = registry;
        return registry;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── v3 PostProcessor Loader ────────────────────────────────────

async function loadV3PostProcessor(): Promise<{ executePostProcessorLoop: (ctx: any) => Promise<any> } | null> {
  const global = globalThis as any;
  if (global.xrayPostProcessor && typeof global.xrayPostProcessor.executePostProcessorLoop === "function") {
    return global.xrayPostProcessor;
  }
  // xrayPostProcessor fallback removed in v2.2
  return null;
}

// ── Context Builder ────────────────────────────────────────────

function buildValidationContext(
  tool: string,
  args: Record<string, unknown> | null,
): RuleValidationContext {
  const op = mapToolToOperation(tool);
  const files: string[] = [];
  let newCode: string | undefined;

  if (args) {
    const filePath = (args.filePath as string) || (args.path as string) || (args.file as string) || "";
    if (filePath) files.push(filePath);

    if (typeof args.content === "string") {
      newCode = args.content;
    } else if (typeof args.code === "string") {
      newCode = args.code;
    } else if (args.content instanceof Map && args.content.size > 0) {
      newCode = Array.from((args.content as Map<string, string>).values()).join("\n");
    } else if (args.newCode instanceof Map && (args.newCode as Map<string, string>).size > 0) {
      newCode = Array.from((args.newCode as Map<string, string>).values()).join("\n");
    }
  }

  return { operation: op, files, ...(newCode ? { newCode } : {}) };
}

function mapToolToOperation(tool: string): string {
  const writeTools = /^(write|edit|create|modify|patch|insert|replace|apply_diff|overwrite_file|write_file)$/i;
  const readTools = /^(read|search|find|list|grep|glob|lookup|get)$/i;
  const execTools = /^(run|execute|bash|terminal|command|shell)$/i;

  if (writeTools.test(tool)) return "write";
  if (readTools.test(tool)) return "read";
  if (execTools.test(tool)) return "execute";
  return "modify";
}

function isCodeProducingTool(tool: string): boolean {
  return mapToolToOperation(tool) === "write" || mapToolToOperation(tool) === "modify";
}

// ── beforeToolHook ─────────────────────────────────────────────

export async function beforeToolHook(
  tool: string,
  args: Record<string, unknown> | null,
  _context?: GateContext,
): Promise<BeforeHookResult> {
  const start = Date.now();

  try {
    const registry = await loadRegistry();
    if (!registry) {
      await frameworkLogger.log("enforcement-gate", "before-hook-registry-unavailable", "warning", { tool });
      return { allowed: true, blocked: false, violations: [], resonance: 0.85, duration: Date.now() - start };
    }

    const validationCtx = buildValidationContext(tool, args);
    const allValidators = registry.getAllValidators();
    const violations: GateViolation[] = [];

    for (const v of allValidators) {
      try {
        const result = await v.validate(validationCtx);
        if (!result.passed) {
          violations.push({
            ruleId: v.ruleId || v.id,
            severity: v.severity || "warning" as const,
            message: result.message || `${v.id} violation detected`,
            ...(result.suggestions ? { suggestions: result.suggestions } : { suggestions: [] }),
          });
        }
      } catch (valErr) {
        await frameworkLogger.log("enforcement-gate", "validator-error", "warning", {
          ruleId: v.id,
          error: String(valErr),
        });
      }
    }

    const blockingViolations = violations.filter(
      (v) => v.severity === "error" || v.severity === "blocking",
    );
    const blocked = blockingViolations.length > 0;

    let resonance = 1.0;
    for (const v of violations) {
      resonance -= v.severity === "error" || v.severity === "blocking" ? 0.15 : 0.05;
    }
    resonance = Math.max(0.1, Math.min(1.0, resonance));

    if (blocked || violations.length > 0) {
      await frameworkLogger.log("enforcement-gate", "before-hook-result", blocked ? "error" : "warning", {
        tool,
        blocked,
        violationCount: violations.length,
        resonance,
        duration: Date.now() - start,
        violations: violations.map((v) => `[${v.severity}] ${v.ruleId}: ${v.message}`),
      });
    }

    return {
      allowed: !blocked,
      blocked,
      violations,
      resonance,
      duration: Date.now() - start,
    };
  } catch (err) {
    await frameworkLogger.log("enforcement-gate", "before-hook-error", "error", {
      tool,
      error: String(err),
    });
    return { allowed: true, blocked: false, violations: [], resonance: 0.85, duration: Date.now() - start };
  }
}

// ── afterToolHook ──────────────────────────────────────────────

export async function afterToolHook(
  tool: string,
  args: Record<string, unknown> | null,
  _result: unknown,
  _error: string | null,
  _context?: GateContext,
): Promise<AfterHookResult> {
  const start = Date.now();

  try {
    if (!isCodeProducingTool(tool)) {
      return { processed: false, violations: [], processorResults: [], governanceTriggered: false, duration: Date.now() - start };
    }

    await frameworkLogger.log("enforcement-gate", "after-hook-start", "info", { tool });

    const registry = await loadRegistry();
    const violations: GateViolation[] = [];
    const processorResults: Array<{ name: string; success: boolean; error?: string }> = [];

    // Step 1: Run per-pipeline validators (same as PostProcessor.ts:382-432)
    if (registry) {
      const validationCtx = buildValidationContext(tool, args);
      const pipelineRules = ["error-resolution", "loop-safety", "boot-wiring", "console-log-usage"];

      for (const ruleId of pipelineRules) {
        try {
          const v = registry.getValidator(ruleId);
          if (!v) continue;
          const result = await v.validate(validationCtx);
          if (!result.passed) {
            violations.push({
              ruleId,
              severity: v.severity || "warning" as const,
              message: result.message || `${ruleId} violation`,
              ...(result.suggestions ? { suggestions: result.suggestions } : { suggestions: [] }),
            });
          }
        } catch (valErr) {
          await frameworkLogger.log("enforcement-gate", "pipeline-validator-error", "warning", {
            ruleId,
            error: String(valErr),
          });
        }
      }
    }

    // Step 2: Legacy ProcessorManager compat (test-auto-creation etc.)
    try {
      const stateManager = await loadStateManager();
      const ProcessorManager = await loadProcessorManager();
      if (ProcessorManager && stateManager) {
        const pm = new ProcessorManager(stateManager);
        const config = { preProcessors: ["preValidate", "codexCompliance", "versionCompliance"] };
        const registered = await pm.registerAllProcessors(config as any);
        processorResults.push({ name: "register-processors", success: true });

        if (registered) {
          const preCtx: Record<string, unknown> = {
            operation: mapToolToOperation(tool),
            files: args?.filePath ? [args.filePath] : [],
            directory: process.cwd(),
          };
          await pm.executePreProcessors(preCtx);
          processorResults.push({ name: "pre-processors", success: true });
        }
      }
    } catch (pmErr) {
      processorResults.push({ name: "processor-manager", success: false, error: String(pmErr) });
      await frameworkLogger.log("enforcement-gate", "processor-error", "warning", {
        tool,
        error: String(pmErr),
      });
    }

    // Step 3: Try v3 PostProcessor loop (with critical violations from pipeline validators)
    try {
      const v3pp = await loadV3PostProcessor();
      if (v3pp) {
        const critical = violations.filter(v => v.severity === "error" || v.severity === "blocking");
        const postCtx = {
          trigger: "manual",
          operation: mapToolToOperation(tool),
          filePath: args?.filePath || args?.path || "",
          directory: process.cwd(),
          newCode: buildValidationContext(tool, args).newCode || "",
          files: buildValidationContext(tool, args).files || [],
          tool,
          metadata: { source: "enforcement-gate", hookType: "integration" },
          criticalViolations: critical.length > 0 ? critical : undefined,
        };
        await v3pp.executePostProcessorLoop(postCtx);
        processorResults.push({ name: "v3-post-processor-loop", success: true });
      }
    } catch (v3Err) {
      processorResults.push({ name: "v3-post-processor-loop", success: false, error: String(v3Err) });
      await frameworkLogger.log("enforcement-gate", "v3-post-processor-error", "warning", {
        tool,
        error: String(v3Err),
      });
    }

    // Step 4: Check for proposal-like results
    let governanceTriggered = false;
    try {
      const result = _result as Record<string, unknown> | null;
      if (result && typeof result === "object" && "title" in result && "description" in result) {
        const { handleGovernRequest } = await import("../nucleus/index.js");
        const governanceResult = await handleGovernRequest({
          proposalId: `gate-${Date.now()}`,
          title: String(result.title || ""),
          description: String(result.description || ""),
          type: String(result.type || "fix"),
          content: result,
        });
        governanceTriggered = governanceResult?.overallDecision === 'approve';
        if (governanceTriggered) {
          await frameworkLogger.log("enforcement-gate", "governance-triggered", "info", {
            tool,
            proposalTitle: String(result.title),
          });
        }
      }
    } catch (govErr) {
      await frameworkLogger.log("enforcement-gate", "governance-error", "warning", {
        tool,
        error: String(govErr),
      });
    }

    await frameworkLogger.log("enforcement-gate", "after-hook-complete", "info", {
      tool,
      violations: violations.length,
      processors: processorResults.length,
      governanceTriggered,
      duration: Date.now() - start,
    });

    return {
      processed: true,
      violations,
      processorResults,
      governanceTriggered,
      duration: Date.now() - start,
    };
  } catch (err) {
    await frameworkLogger.log("enforcement-gate", "after-hook-error", "error", {
      tool,
      error: String(err),
    });
    return { processed: false, violations: [], processorResults: [], governanceTriggered: false, duration: Date.now() - start };
  }
}

// ── Helpers ────────────────────────────────────────────────────

async function loadStateManager(): Promise<any> {
  const global = globalThis as any;
  if (global.xrayStateManager) return global.xrayStateManager;
  // xrayStateManager fallback removed in v2.2

  const candidatePaths = [
    () => import("../state/state-manager.js"),
    () => import("../../node_modules/0xray/dist/state/state-manager.js"),
  ];
  for (const load of candidatePaths) {
    try {
      const mod = await (load() as Promise<Record<string, any>>);
      const SM = mod.XrayStateManager;
      if (SM) return SM;
    } catch { continue; }
  }
  return null;
}

async function loadProcessorManager(): Promise<any> {
  const candidatePaths = [
    () => import("../processors/processor-manager.js"),
    () => import("../../node_modules/0xray/dist/processors/processor-manager.js"),
  ];
  for (const load of candidatePaths) {
    try {
      const mod = await load();
      return mod.ProcessorManager;
    } catch { continue; }
  }
  return null;
}
