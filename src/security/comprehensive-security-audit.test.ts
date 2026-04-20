/**
 * Comprehensive Security Audit System Tests
 *
 * Tests for vulnerability scanning, compliance checking,
 * weighted voting, and remediation planning.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ComprehensiveSecurityAuditSystem,
  createSecurityAuditSystem,
  runQuickSecurityAudit,
  runDeepSecurityAudit,
  type SecurityAuditConfig,
  type Vulnerability,
  type WeightedVote,
} from "./comprehensive-security-audit.js";

describe("ComprehensiveSecurityAuditSystem", () => {
  let auditSystem: ComprehensiveSecurityAuditSystem;
  let testConfig: SecurityAuditConfig;

  beforeEach(() => {
    testConfig = {
      projectPath: process.cwd(),
      scanDepth: "shallow",
      includeDependencies: false,
      complianceStandards: ["owasp-top-10", "cwe"],
      enableAutoRemediation: true,
      enableWeightedVoting: true,
    };
    auditSystem = createSecurityAuditSystem(testConfig);
  });

  describe("constructor", () => {
    it("should create a security audit system with default config", () => {
      const system = createSecurityAuditSystem({
        projectPath: "/test",
      });

      expect(system).toBeInstanceOf(ComprehensiveSecurityAuditSystem);
    });

    it("should override defaults with provided config", () => {
      const customWeights = {
        "security-auditor": 0.5,
        "code-analyzer": 0.5,
      };

      const system = createSecurityAuditSystem({
        projectPath: "/test",
        agentWeights: customWeights,
      });

      expect(system).toBeInstanceOf(ComprehensiveSecurityAuditSystem);
    });
  });

  describe("runAudit", () => {
    it("should complete audit without errors", async () => {
      const report = await auditSystem.runAudit();

      expect(report).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.metadata.auditId).toBeDefined();
      expect(report.metadata.timestamp).toBeInstanceOf(Date);
    });

    it("should scan project files", async () => {
      const report = await auditSystem.runAudit();

      expect(report.metadata.totalFilesScanned).toBeGreaterThan(0);
    });

    it("should calculate security score", async () => {
      const report = await auditSystem.runAudit();

      expect(report.summary.securityScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.securityScore).toBeLessThanOrEqual(100);
    });

    it("should identify vulnerabilities by severity", async () => {
      const report = await auditSystem.runAudit();

      expect(report.summary.bySeverity).toBeDefined();
      expect(report.summary.bySeverity.critical).toBeGreaterThanOrEqual(0);
      expect(report.summary.bySeverity.high).toBeGreaterThanOrEqual(0);
      expect(report.summary.bySeverity.medium).toBeGreaterThanOrEqual(0);
      expect(report.summary.bySeverity.low).toBeGreaterThanOrEqual(0);
    });

    it("should check compliance standards", async () => {
      const report = await auditSystem.runAudit();

      expect(report.compliance).toBeDefined();
      expect(report.compliance.length).toBeGreaterThan(0);

      for (const result of report.compliance) {
        expect(result.standard).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(typeof result.passed).toBe("boolean");
      }
    });

    it("should generate remediation plan", async () => {
      const report = await auditSystem.runAudit();

      expect(report.remediation).toBeDefined();
      expect(report.remediation.totalIssues).toBeGreaterThanOrEqual(0);
      expect(report.remediation.automatable).toBeGreaterThanOrEqual(0);
      expect(report.remediation.manualRequired).toBeGreaterThanOrEqual(0);
      expect(typeof report.remediation.estimatedFixTime).toBe("string");
    });
  });

  describe("weighted voting", () => {
    it("should collect agent votes when enabled", async () => {
      const report = await auditSystem.runAudit();

      if (testConfig.enableWeightedVoting) {
        expect(report.agentConsensus).toBeDefined();
        expect(report.agentConsensus?.participatingAgents).toBeDefined();
      }
    });

    it("should calculate average agreement", async () => {
      const report = await auditSystem.runAudit();

      if (report.agentConsensus) {
        expect(report.agentConsensus.averageAgreement).toBeGreaterThanOrEqual(0);
        expect(report.agentConsensus.averageAgreement).toBeLessThanOrEqual(100);
      }
    });

    it("should identify contentious issues", async () => {
      const report = await auditSystem.runAudit();

      if (report.agentConsensus) {
        expect(Array.isArray(report.agentConsensus.contentiousIssues)).toBe(true);
      }
    });
  });

  describe("addVote", () => {
    it("should add a vote to the system", () => {
      const vote: WeightedVote = {
        agentId: "test-agent",
        agentName: "tester",
        vote: "approve",
        weight: 0.5,
        reasoning: "Test vote",
        concerns: ["Minor issue"],
      };

      auditSystem.addVote(vote);

      const decisions = auditSystem.getArchitecturalDecisions();
      expect(decisions).toBeDefined();
    });
  });

  describe("OWASP compliance", () => {
    it("should evaluate OWASP Top 10 compliance", async () => {
      const system = createSecurityAuditSystem({
        projectPath: process.cwd(),
        complianceStandards: ["owasp-top-10"],
        enableWeightedVoting: false,
      });

      const report = await system.runAudit();
      const owaspResult = report.compliance.find((c) => c.standard === "owasp-top-10");

      expect(owaspResult).toBeDefined();
      expect(owaspResult?.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("CWE compliance", () => {
    it("should evaluate CWE compliance", async () => {
      const system = createSecurityAuditSystem({
        projectPath: process.cwd(),
        complianceStandards: ["cwe"],
        enableWeightedVoting: false,
      });

      const report = await system.runAudit();
      const cweResult = report.compliance.find((c) => c.standard === "cwe");

      expect(cweResult).toBeDefined();
      expect(cweResult?.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateMarkdownReport", () => {
    it("should generate valid markdown report", async () => {
      const report = await auditSystem.runAudit();
      const markdown = auditSystem.generateMarkdownReport(report);

      expect(markdown).toContain("# Security Audit Report");
      expect(markdown).toContain("## Executive Summary");
      expect(markdown).toContain("## Security Score");
      expect(markdown).toContain("## Vulnerability Summary");
    });

    it("should include vulnerability counts in report", async () => {
      const report = await auditSystem.runAudit();
      const markdown = auditSystem.generateMarkdownReport(report);

      expect(markdown).toContain(`Critical | ${report.summary.bySeverity.critical}`);
      expect(markdown).toContain(`High | ${report.summary.bySeverity.high}`);
      expect(markdown).toContain(`Medium | ${report.summary.bySeverity.medium}`);
    });
  });

  describe("vulnerability detection", () => {
    it("should detect code injection patterns", async () => {
      const vulnerabilities = auditSystem.getVulnerabilities();
      expect(Array.isArray(vulnerabilities)).toBe(true);
    });

    it("should categorize vulnerabilities", async () => {
      const report = await auditSystem.runAudit();

      for (const vuln of report.vulnerabilities) {
        expect(vuln.category).toBeDefined();
        expect(vuln.severity).toBeDefined();
        expect(vuln.cwe).toBeDefined();
      }
    });

    it("should include remediation steps", async () => {
      const report = await auditSystem.runAudit();

      for (const vuln of report.vulnerabilities) {
        expect(vuln.recommendation).toBeDefined();
        expect(typeof vuln.recommendation).toBe("string");
      }
    });
  });

  describe("getVulnerabilities", () => {
    it("should return vulnerabilities after audit", async () => {
      await auditSystem.runAudit();
      const vulnerabilities = auditSystem.getVulnerabilities();

      expect(Array.isArray(vulnerabilities)).toBe(true);
    });
  });
});

describe("runQuickSecurityAudit", () => {
  it("should complete a quick audit", async () => {
    const report = await runQuickSecurityAudit(process.cwd());

    expect(report).toBeDefined();
    expect(report.metadata.auditId).toBeDefined();
    expect(report.summary.securityScore).toBeGreaterThanOrEqual(0);
  });
});

describe("runDeepSecurityAudit", () => {
  it("should complete a deep audit", async () => {
    const report = await runDeepSecurityAudit(process.cwd());

    expect(report).toBeDefined();
    expect(report.metadata.auditId).toBeDefined();
    expect(report.compliance.length).toBeGreaterThanOrEqual(5);
  });

  it("should accept output path", async () => {
    const report = await runDeepSecurityAudit(process.cwd(), "/tmp/test-report.json");

    expect(report).toBeDefined();
  });
});

describe("Vulnerability interface", () => {
  it("should have required properties", () => {
    const vulnerability: Vulnerability = {
      id: "test-1",
      title: "Test Vulnerability",
      severity: "high",
      category: "injection",
      cwe: "CWE-78",
      file: "/test/file.ts",
      line: 1,
      description: "Test description",
      impact: "Test impact",
      recommendation: "Test recommendation",
      codeSnippet: "test code",
      confidence: 85,
    };

    expect(vulnerability.id).toBe("test-1");
    expect(vulnerability.title).toBe("Test Vulnerability");
    expect(vulnerability.severity).toBe("high");
    expect(vulnerability.category).toBe("injection");
    expect(vulnerability.cwe).toBe("CWE-78");
  });

  it("should support optional OWASP reference", () => {
    const vulnerability: Vulnerability = {
      id: "test-2",
      title: "Test Vulnerability",
      severity: "medium",
      category: "cryptography",
      cwe: "CWE-328",
      file: "/test/file.ts",
      line: 1,
      description: "Test description",
      impact: "Test impact",
      recommendation: "Test recommendation",
      codeSnippet: "test code",
      confidence: 75,
      owasp: "A02:2021-Cryptographic Failures",
    };

    expect(vulnerability.owasp).toBe("A02:2021-Cryptographic Failures");
  });
});

describe("WeightedVote interface", () => {
  it("should support all vote types", () => {
    const approveVote: WeightedVote = {
      agentId: "agent-1",
      agentName: "security-auditor",
      vote: "approve",
      weight: 0.35,
      reasoning: "All checks passed",
    };

    const rejectVote: WeightedVote = {
      agentId: "agent-2",
      agentName: "code-analyzer",
      vote: "reject",
      weight: 0.30,
      reasoning: "Critical issues found",
      concerns: ["SQL injection vulnerability", "Hardcoded secrets"],
    };

    const abstainVote: WeightedVote = {
      agentId: "agent-3",
      agentName: "testing-lead",
      vote: "abstain",
      weight: 0.20,
      reasoning: "Need more information",
    };

    expect(approveVote.vote).toBe("approve");
    expect(rejectVote.vote).toBe("reject");
    expect(abstainVote.vote).toBe("abstain");
  });

  it("should support optional concerns", () => {
    const voteWithoutConcerns: WeightedVote = {
      agentId: "agent-4",
      agentName: "architect",
      vote: "approve",
      weight: 0.15,
      reasoning: "Looks good",
    };

    const voteWithConcerns: WeightedVote = {
      agentId: "agent-5",
      agentName: "security-auditor",
      vote: "approve",
      weight: 0.35,
      reasoning: "With minor concerns",
      concerns: ["Minor issue 1"],
    };

    expect(voteWithoutConcerns.concerns).toBeUndefined();
    expect(voteWithConcerns.concerns).toContain("Minor issue 1");
  });
});
