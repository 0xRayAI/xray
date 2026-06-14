// Consumer runtime compat shim from prior StringRay releases (1-line min per Scope Rule; primary xray paths + XRAY_||STRRAY_ env + .strray fallbacks)

import type { StringRayStateManager } from "../state/state-manager.js";
import type { ProcessorManager } from "../processors/processor-manager.js";
import type { PostProcessor } from "../postprocessor/PostProcessor.js";
import type { PathResolver } from "../utils/path-resolver.js";
import type { CodexInjector } from "../core/codex-injector.js";

export interface StringRayHook {
  name: string;
  [key: string]: unknown;
}

export interface CurrentAgent {
  agentType?: string;
  type?: string;
  [key: string]: unknown;
}

export interface StringRayGlobalScope {
  strRayStateManager: StringRayStateManager;
  strRayProcessorManager: ProcessorManager;
  strRayPostProcessor: PostProcessor;
  strRayPathResolver: PathResolver;
  strRayCodexInjector: CodexInjector;
  strRayHooks: StringRayHook[];
  currentAgent: CurrentAgent;
}

declare global {
  // eslint-disable-next-line no-var
  var strRayStateManager: StringRayGlobalScope["strRayStateManager"] | undefined;
  // eslint-disable-next-line no-var
  var strRayProcessorManager: StringRayGlobalScope["strRayProcessorManager"] | undefined;
  // eslint-disable-next-line no-var
  var strRayPostProcessor: StringRayGlobalScope["strRayPostProcessor"] | undefined;
  // eslint-disable-next-line no-var
  var strRayPathResolver: StringRayGlobalScope["strRayPathResolver"] | undefined;
  // eslint-disable-next-line no-var
  var strRayCodexInjector: StringRayGlobalScope["strRayCodexInjector"] | undefined;
  // eslint-disable-next-line no-var
  var strRayHooks: StringRayHook[] | undefined;
  // eslint-disable-next-line no-var
  var currentAgent: StringRayGlobalScope["currentAgent"] | undefined;
}

export type { StringRayGlobalScope };