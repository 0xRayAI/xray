import { assertIntakeAllowed } from "../gates/intake-gate.js";

export const preValidateProcessor = {
  name: "preValidate",
  priority: 1,
  async run(ctx) {
    const summary = ctx.summary;
    if (typeof summary === "string" && summary.includes("undefined")) {
      throw new Error("Potential undefined usage detected in lesson summary");
    }
    return { syntaxCheck: "passed" };
  },
};

export const intakeGateProcessor = {
  name: "intakeGate",
  priority: 2,
  async run(ctx) {
    assertIntakeAllowed(String(ctx.summary ?? ""));
    return { intakeGate: "open" };
  },
};

export const governanceStampProcessor = {
  name: "governanceStamp",
  priority: 3,
  async run(ctx) {
    if (!ctx.governance || typeof ctx.governance !== "object") {
      throw new Error("Governance pre-check result missing from context");
    }
    return { governanceStamped: true, stampedAt: new Date().toISOString() };
  },
};

export const builtinPreProcessors = [
  preValidateProcessor,
  intakeGateProcessor,
  governanceStampProcessor,
];
