import { execFileSync } from "node:child_process";
import { frameworkLogger } from "../core/framework-logger.js";

export type GovernanceRole = "code-review" | "security-audit" | "researcher";

export interface GovernanceVote {
  decision: "approve" | "reject" | "abstain";
  confidence: number;
  reasoning: string;
}

const DEFAULT_HERMES_PROVIDER = "xai-oauth";
const DEFAULT_HERMES_MODEL = "grok-4.3";
const DEFAULT_HERMES_TIMEOUT_MS = 120_000;

const ROLE_PROMPTS: Record<GovernanceRole, string> = {
  "code-review": `You are a senior code reviewer on a governance committee for a software project. Analyze the following proposal from a code quality, maintainability, readability, and engineering best practices perspective.

Consider:
- Does the proposal improve or degrade code quality?
- Does it follow established design patterns?
- Does it introduce technical debt?
- Are there potential regressions or edge cases?

Respond with a structured vote in exactly this format:
DECISION: approve|reject|abstain
CONFIDENCE: <0.0-1.0>
REASONING: <2-4 sentence analysis of the proposal's code quality implications>`,

  "security-audit": `You are a senior security engineer on a governance committee for a software project. Analyze the following proposal from a security, threat modeling, and compliance perspective.

Consider:
- Does the proposal introduce new attack surface?
- Does it handle authentication, authorization, and data protection properly?
- Are there compliance implications (GDPR, SOC2, PCI-DSS, etc.)?
- Does it follow security best practices (input validation, least privilege, defense in depth)?

Respond with a structured vote in exactly this format:
DECISION: approve|reject|abstain
CONFIDENCE: <0.0-1.0>
REASONING: <2-4 sentence analysis of the proposal's security implications>`,

  "researcher": `You are a senior architect and researcher on a governance committee for a software project. Analyze the following proposal from a codebase-wide architectural and historical perspective.

Consider:
- Does the proposal align with the project's observed architecture patterns?
- Does it integrate well with existing systems and data flows?
- Does it address recurring problems observed in the project history?
- What is the broader impact on the codebase ecosystem?

Respond with a structured vote in exactly this format:
DECISION: approve|reject|abstain
CONFIDENCE: <0.0-1.0>
REASONING: <2-4 sentence analysis of the proposal's broader project impact>`,
};

type DirectLlmConfig = {
  mode: "direct";
  endpoint: string;
  apiKey: string;
  model: string;
};

type HermesCliConfig = {
  mode: "hermes";
  provider: string;
  model: string;
  timeoutMs: number;
};

type GovernanceLlmConfig = DirectLlmConfig | HermesCliConfig;

function resolveHermesProvider(): string {
  return process.env.HERMES_PROVIDER?.trim() || DEFAULT_HERMES_PROVIDER;
}

function resolveHermesModel(): string {
  return process.env.HERMES_MODEL?.trim() || DEFAULT_HERMES_MODEL;
}

function resolveHermesTimeoutMs(): number {
  const raw = process.env.HERMES_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_HERMES_TIMEOUT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HERMES_TIMEOUT_MS;
}

export function resolveHermesBin(): string {
  const explicit = process.env.HERMES_BIN?.trim();
  if (explicit) return explicit;
  return "hermes";
}

function getDirectLlmConfig(): DirectLlmConfig | null {
  const endpoint =
    process.env.XRAY_LLM_ENDPOINT ||
    process.env.XRAY_GOVERNANCE_LLM_ENDPOINT ||
    "";
  const apiKey =
    process.env.XRAY_LLM_API_KEY ||
    process.env.XRAY_GOVERNANCE_LLM_API_KEY ||
    "";
  const model =
    process.env.XRAY_LLM_MODEL ||
    process.env.XRAY_GOVERNANCE_LLM_MODEL ||
    "gpt-4o";
  const directEnabled =
    process.env.XRAY_GOVERNANCE_LLM_ENABLED === "true" ||
    process.env.XRAY_LLM_ENABLED === "true";

  if (directEnabled && endpoint && apiKey) {
    return { mode: "direct", endpoint, apiKey, model };
  }

  if (endpoint && apiKey) {
    return { mode: "direct", endpoint, apiKey, model };
  }

  return null;
}

function getConfig(): GovernanceLlmConfig | null {
  const direct = getDirectLlmConfig();
  if (direct) return direct;

  if (hermesCliAvailable()) {
    return {
      mode: "hermes",
      provider: resolveHermesProvider(),
      model: resolveHermesModel(),
      timeoutMs: resolveHermesTimeoutMs(),
    };
  }

  return null;
}

export function hermesCliAvailable(): boolean {
  try {
    execFileSync(resolveHermesBin(), ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

function buildGovernancePrompt(
  role: GovernanceRole,
  proposalTitle: string,
  proposalDescription: string,
  evidence: string[],
  proposalType: string,
): string {
  const evidenceBlock =
    evidence.length > 0
      ? `**Supporting Evidence:**\n${evidence.map((entry, index) => `${index + 1}. ${entry}`).join("\n")}\n\n`
      : "";

  return `${ROLE_PROMPTS[role]}

## Proposal

**Title:** ${proposalTitle}

**Description:** ${proposalDescription}

**Type:** ${proposalType}

${evidenceBlock}---

Please provide your structured vote.`;
}

function runHermesGovernanceInference(
  prompt: string,
  config: HermesCliConfig,
): string {
  return execFileSync(
    resolveHermesBin(),
    ["-z", prompt, "--provider", config.provider, "--model", config.model],
    {
      encoding: "utf8",
      timeout: config.timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    },
  ).trim();
}

function parseVote(text: string): GovernanceVote | null {
  const decisionMatch = text.match(/DECISION:\s*(approve|reject|abstain)/i);
  const confidenceMatch = text.match(/CONFIDENCE:\s*([0-9.]+)/i);
  const reasoningMatch = text.match(/REASONING:\s*(.+)/is);

  if (!decisionMatch || !decisionMatch[1]) return null;

  const rawConfidence = confidenceMatch?.[1];
  const confidence = rawConfidence ? parseFloat(rawConfidence) : 0.5;

  return {
    decision: decisionMatch[1].toLowerCase() as "approve" | "reject" | "abstain",
    confidence: isNaN(confidence) ? 0.5 : Math.min(1, Math.max(0, confidence)),
    reasoning: reasoningMatch?.[1]?.trim() || "No reasoning provided",
  };
}

async function callDirectLlm(
  role: GovernanceRole,
  config: DirectLlmConfig,
  proposalTitle: string,
  proposalDescription: string,
  evidence: string[],
  proposalType: string,
): Promise<string | null> {
  const systemPrompt = ROLE_PROMPTS[role];
  const userMessage = `## Proposal

**Title:** ${proposalTitle}

**Description:** ${proposalDescription}

**Type:** ${proposalType}

${evidence.length > 0 ? `**Supporting Evidence:**\n${evidence.map((entry, index) => `${index + 1}. ${entry}`).join("\n")}` : ""}

---

Please provide your structured vote.`;

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    frameworkLogger.log("llm-governance", "api-call", "error", {
      status: response.status,
      statusText: response.statusText,
      role,
    });
    return null;
  }

  const data = (await response.json()) as Record<string, unknown>;
  const choices = data?.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  return (message?.content as string | undefined) ?? null;
}

export async function tryLLMGovernance(
  role: GovernanceRole,
  proposalTitle: string,
  proposalDescription: string,
  evidence: string[],
  proposalType: string,
): Promise<GovernanceVote | null> {
  const config = getConfig();

  if (!config) {
    process.stderr.write(`[llm] no config for role=${role}\n`);
    return null;
  }

  if (config.mode === "hermes") {
    process.stderr.write(
      `[llm] using hermes -z provider=${config.provider} model=${config.model}\n`,
    );
    frameworkLogger.log("llm-governance", "using-hermes-cli", "info", {
      provider: config.provider,
      model: config.model,
      role,
    });
  } else {
    process.stderr.write(
      `[llm] using direct endpoint=${config.endpoint} model=${config.model}\n`,
    );
  }

  try {
    const content =
      config.mode === "hermes"
        ? runHermesGovernanceInference(
            buildGovernancePrompt(
              role,
              proposalTitle,
              proposalDescription,
              evidence,
              proposalType,
            ),
            config,
          )
        : await callDirectLlm(
            role,
            config,
            proposalTitle,
            proposalDescription,
            evidence,
            proposalType,
          );

    if (!content) {
      frameworkLogger.log("llm-governance", "parse", "warning", {
        issue: "missing content in response",
        role,
      });
      return null;
    }

    const vote = parseVote(content);
    if (!vote) {
      frameworkLogger.log("llm-governance", "parse", "warning", {
        issue: "unparseable response",
        snippet: content.slice(0, 200),
        role,
      });
      return null;
    }

    frameworkLogger.log("llm-governance", "vote", "success", {
      role,
      decision: vote.decision,
      confidence: vote.confidence,
    });

    return vote;
  } catch (error) {
    frameworkLogger.log("llm-governance", "error", "error", {
      error: String(error),
      role,
    });
    return null;
  }
}

export function checkHermesOAuthStatus(): {
  configured: boolean;
  endpoint?: string;
  model?: string;
  error?: string;
} {
  const direct = getDirectLlmConfig();
  if (direct) {
    return {
      configured: true,
      endpoint: direct.endpoint,
      model: direct.model,
    };
  }

  if (hermesCliAvailable()) {
    return {
      configured: true,
      endpoint: "hermes-cli",
      model: resolveHermesModel(),
    };
  }

  return {
    configured: false,
    error:
      "Hermes CLI not found on PATH. Install Hermes and ensure xai-oauth is configured (same path as gateway/cron: hermes auth add xai-oauth).",
  };
}