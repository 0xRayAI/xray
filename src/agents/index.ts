import type { AgentConfig } from "./types.js";
import { enforcer } from "./enforcer.js";
import { architect } from "./architect.js";
import { orchestrator } from "./orchestrator.js";
import { bugTriageSpecialist } from "./bug-triage-specialist.js";
import { codeReviewer } from "./code-reviewer.js";
import { securityAuditor } from "./security-auditor.js";
import { refactorer } from "./refactorer.js";
import { testingLead } from "./testing-lead.js";
import { logMonitor } from "./log-monitor.js";
import { researcher } from "./researcher.js";
import { codeAnalyzer } from "./code-analyzer.js";
import { backendEngineer } from "./backend-engineer.js";
import { contentCreator } from "./content-creator.js";
import { databaseEngineer } from "./database-engineer.js";
import { devopsEngineer } from "./devops-engineer.js";
import { frontendEngineer } from "./frontend-engineer.js";
import { frontendUiUxEngineer } from "./frontend-ui-ux-engineer.js";
import { growthStrategist } from "./growth-strategist.js";
import { mobileDeveloper } from "./mobile-developer.js";
import { performanceEngineer } from "./performance-engineer.js";
import { seoConsultant } from "./seo-consultant.js";
import { strategist } from "./strategist.js";
import { techWriter } from "./tech-writer.js";

export const builtinAgents: Record<string, AgentConfig> = {
  enforcer,
  architect,
  orchestrator,
  "bug-triage-specialist": bugTriageSpecialist,
  "code-reviewer": codeReviewer,
  "security-auditor": securityAuditor,
  refactorer,
  "testing-lead": testingLead,
  "log-monitor": logMonitor,
  researcher,
  "code-analyzer": codeAnalyzer,
  "backend-engineer": backendEngineer,
  "content-creator": contentCreator,
  "database-engineer": databaseEngineer,
  "devops-engineer": devopsEngineer,
  "frontend-engineer": frontendEngineer,
  "frontend-ui-ux-engineer": frontendUiUxEngineer,
  "growth-strategist": growthStrategist,
  "mobile-developer": mobileDeveloper,
  "performance-engineer": performanceEngineer,
  "seo-consultant": seoConsultant,
  strategist,
  "tech-writer": techWriter,
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
  logMonitor,
  researcher,
  codeAnalyzer,
  backendEngineer,
  contentCreator,
  databaseEngineer,
  devopsEngineer,
  frontendEngineer,
  frontendUiUxEngineer,
  growthStrategist,
  mobileDeveloper,
  performanceEngineer,
  seoConsultant,
  strategist,
  techWriter,
};
