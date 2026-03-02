import type { AgentConfig } from "./types.js";
import { enforcer } from "./enforcer.js";
import { architect } from "./architect.js";
import { orchestrator } from "./orchestrator.js";
import { bugTriageSpecialist } from "./bug-triage-specialist.js";
import { codeReviewer } from "./code-reviewer.js";
import { securityAuditor } from "./security-auditor.js";
import { refactorer } from "./refactorer.js";
import { testingLead } from "./testing-lead.js";
import { logMonitorAgent } from "./log-monitor.js";
import { researcher } from "./researcher.js";
import { multimodalLooker } from "./multimodal-looker.js";
import { analyzer } from "./analyzer.js";
import { seoSpecialist } from "./seo-consultant.js";
import { seoCopywriter } from "./content-creator.js";
import { marketingExpert } from "./growth-strategist.js";
import { databaseEngineer } from "./database-engineer.js";
import { devopsEngineer } from "./devops-engineer.js";
import { backendEngineer } from "./backend-engineer.js";
import { frontendEngineer } from "./frontend-engineer.js";
import { frontendUiUxEngineer } from "./frontend-ui-ux-engineer.js";
import { documentationWriter } from "./tech-writer.js";
import { performanceEngineer } from "./performance-engineer.js";
import { mobileDeveloper } from "./mobile-developer.js";
import { strategist } from "./strategist.js";

export const builtinAgents: Record<string, AgentConfig> = {
  enforcer,
  architect,
  orchestrator,
  "bug-triage-specialist": bugTriageSpecialist,
  "code-reviewer": codeReviewer,
  "security-auditor": securityAuditor,
  refactorer,
  "testing-lead": testingLead,
  "log-monitor": logMonitorAgent,
  researcher,
  "multimodal-looker": multimodalLooker,
  analyzer: analyzer,
  "code-analyzer": analyzer,
  "seo-consultant": seoSpecialist,
  "content-creator": seoCopywriter,
  "growth-strategist": marketingExpert,
  "database-engineer": databaseEngineer,
  "devops-engineer": devopsEngineer,
  "backend-engineer": backendEngineer,
  "frontend-engineer": frontendEngineer,
  "frontend-ui-ux-engineer": frontendUiUxEngineer,
  "tech-writer": documentationWriter,
  "performance-engineer": performanceEngineer,
  "mobile-developer": mobileDeveloper,
  strategist,
};

export {
  enforcer,
  architect,
  orchestrator,
  bugTriageSpecialist,
  codeReviewer,
  securityAuditor,
  refactorer,
  testingLead,
  logMonitorAgent,
  researcher,
  multimodalLooker,
  analyzer,
  seoSpecialist,
  seoCopywriter,
  marketingExpert,
  databaseEngineer,
  devopsEngineer,
  backendEngineer,
  frontendEngineer,
  frontendUiUxEngineer,
  documentationWriter,
  performanceEngineer,
  mobileDeveloper,
  strategist,
};
