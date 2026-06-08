export { KernelOrchestrator } from "./orchestrator.js";
export { defaultXrayConfig, defaultXrayConfig as defaultStringRayConfig } from "./xray-activation.js"; // consumer runtime compat from prior StringRay releases (1-line min per Scope Rule)

// Decoupled config path resolution (Layer 1)
export {
  getConfigDir,
  resolveConfigPath,
  resolveStateDir,
  resolveProfilesDir,
  resolveCodexPath,
  resolveLogDir,
  resetConfigDirCache,
  STRRAY_CONFIG_DIR_ENV,
} from "./config-paths.js";

// Standalone codex formatter (Layer 2)
export {
  formatCodexPrompt,
  formatMinimalCodexPrompt,
  getCodexConfig,
  findCodexPath,
  loadCodex,
  BUILTIN_CODEX,
} from "./codex-formatter.js";
export type {
  CodexTerm,
  CodexConfig,
  FormatOptions,
  FormatResult,
} from "./codex-formatter.js";
