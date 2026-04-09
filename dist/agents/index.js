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
import { codeAnalyzer } from "./code-analyzer.js";
export const builtinAgents = {
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
    "code-analyzer": codeAnalyzer,
};
export { enforcer, architect, orchestrator, bugTriageSpecialist, codeReviewer, securityAuditor, refactorer, testingLead, logMonitorAgent, researcher, codeAnalyzer, };
//# sourceMappingURL=index.js.map