import type { AgentConfig } from "./types.js";
import { enforcer } from "./enforcer.js";
import { architect } from "./architect.js";
import { orchestrator } from "./orchestrator.js";
import { bugTriageSpecialist } from "./bug-triage-specialist.js";
import { codeReviewer } from "./code-reviewer.js";
import { securityAuditor } from "./security-auditor.js";
import { refactorer } from "./refactorer.js";
import { testArchitect } from "./test-architect.js";
import { logMonitorAgent } from "./log-monitor.js";
import { librarian } from "./librarian.js";
import { multimodalLooker } from "./multimodal-looker.js";
import { analyzer } from "./analyzer.js";
import { seoSpecialist } from "./seo-specialist.js";
import { seoCopywriter } from "./seo-copywriter.js";
import { marketingExpert } from "./marketing-expert.js";

export const builtinAgents: Record<string, AgentConfig> = {
  enforcer,
  architect,
  orchestrator,
  "bug-triage-specialist": bugTriageSpecialist,
  "code-reviewer": codeReviewer,
  "security-auditor": securityAuditor,
  refactorer,
  "test-architect": testArchitect,
  "log-monitor": logMonitorAgent,
  librarian,
  "multimodal-looker": multimodalLooker,
  analyzer: analyzer,
  "seo-specialist": seoSpecialist,
  "seo-copywriter": seoCopywriter,
  "marketing-expert": marketingExpert,
};

export {
  enforcer,
  architect,
  orchestrator,
  bugTriageSpecialist,
  codeReviewer,
  securityAuditor,
  refactorer,
  testArchitect,
  logMonitorAgent,
  librarian,
  multimodalLooker,
  analyzer,
  seoSpecialist,
  seoCopywriter,
  marketingExpert,
};
