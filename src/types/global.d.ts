// Consumer runtime compat shim from prior 0xRay releases (1-line min per Scope Rule; primary xray paths + .xray fallbacks)

import type { XrayStateManager } from "../state/state-manager.js";
import type { ProcessorManager } from "../processors/processor-manager.js";
import type { PostProcessor } from "../postprocessor/PostProcessor.js";
import type { PathResolver } from "../utils/path-resolver.js";
import type { CodexInjector } from "../core/codex-injector.js";

export interface XrayHook {
  name: string;
  [key: string]: unknown;
}

export interface CurrentAgent {
  agentType?: string;
  type?: string;
  [key: string]: unknown;
}

export interface XrayGlobalScope {
  xrayStateManager: XrayStateManager;
  xrayProcessorManager: ProcessorManager;
  xrayPostProcessor: PostProcessor;
  xrayPathResolver: PathResolver;
  xrayCodexInjector: CodexInjector;
  xrayHooks: XrayHook[];
  currentAgent: CurrentAgent;
}

declare global {
  // eslint-disable-next-line no-var
  var xrayStateManager: XrayGlobalScope["xrayStateManager"] | undefined;
  // eslint-disable-next-line no-var
  var xrayProcessorManager: XrayGlobalScope["xrayProcessorManager"] | undefined;
  // eslint-disable-next-line no-var
  var xrayPostProcessor: XrayGlobalScope["xrayPostProcessor"] | undefined;
  // eslint-disable-next-line no-var
  var xrayPathResolver: XrayGlobalScope["xrayPathResolver"] | undefined;
  // eslint-disable-next-line no-var
  var xrayCodexInjector: XrayGlobalScope["xrayCodexInjector"] | undefined;
  // eslint-disable-next-line no-var
  var xrayHooks: XrayHook[] | undefined;
  // eslint-disable-next-line no-var
  var currentAgent: XrayGlobalScope["currentAgent"] | undefined;

  // Backward compat global aliases (retired)
}

export type { XrayGlobalScope };

// Backward compat type aliases
