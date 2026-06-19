import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { frameworkLogger } from "../core/framework-logger.js";

export type GovernanceRole = "code-review" | "security-audit" | "researcher";

export interface GovernanceVote {
  decision: "approve" | "reject" | "abstain";
  confidence: number;
  reasoning: string;
}

const XAI_ENDPOINT = "https://api.x.ai/v1/chat/completions";
const XAI_MODEL = "grok-4.3";

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

interface HermesOAuthEntry {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  provider?: string;
}

function resolveHermesExpiresAt(
  provider: Record<string, unknown>,
  tokens?: Record<string, unknown>,
): number | undefined {
  if (typeof provider.expires_at === "number") return provider.expires_at;
  const expiresIn = tokens?.expires_in ?? provider.expires_in;
  if (typeof expiresIn !== "number") return undefined;

  const refreshCandidates = [provider.last_refresh, tokens?.last_refresh];
  for (const lastRefresh of refreshCandidates) {
    if (typeof lastRefresh !== "string") continue;
    const base = Date.parse(lastRefresh);
    if (!Number.isNaN(base)) {
      return Math.floor((base + expiresIn * 1000) / 1000);
    }
  }
  return undefined;
}

function extractHermesOAuthEntry(data: unknown): HermesOAuthEntry | undefined {
  if (!data || typeof data !== "object") return undefined;

  if (Array.isArray(data)) {
    return data.find(
      (e: HermesOAuthEntry) => e.provider === "xai-oauth" || !!e.access_token,
    );
  }

  const record = data as Record<string, unknown>;

  const legacy = record["xai-oauth"];
  if (legacy && typeof legacy === "object") {
    const entry = legacy as HermesOAuthEntry;
    if (entry.access_token) return entry;
  }

  if (typeof record.access_token === "string") {
    return record as HermesOAuthEntry;
  }

  for (const bucket of ["providers", "credential_pool"] as const) {
    const pool = record[bucket];
    if (!pool || typeof pool !== "object") continue;
    const provider = (pool as Record<string, unknown>)["xai-oauth"];
    if (!provider) continue;

    // Hermes gateway / credential_pool: xai-oauth is an array of oauth credentials
    if (Array.isArray(provider)) {
      const fromPool = extractHermesOAuthEntry(provider);
      if (fromPool?.access_token) {
        return { ...fromPool, provider: fromPool.provider ?? "xai-oauth" };
      }
      continue;
    }

    if (typeof provider !== "object") continue;
    const prov = provider as Record<string, unknown>;
    const tokens =
      prov.tokens && typeof prov.tokens === "object"
        ? (prov.tokens as Record<string, unknown>)
        : undefined;

    if (tokens && typeof tokens.access_token === "string") {
      const entry: HermesOAuthEntry = {
        access_token: tokens.access_token,
        provider: "xai-oauth",
      };
      if (typeof tokens.refresh_token === "string") {
        entry.refresh_token = tokens.refresh_token;
      }
      const expiresAt = resolveHermesExpiresAt(prov, tokens);
      if (expiresAt !== undefined) entry.expires_at = expiresAt;
      if (typeof tokens.token_type === "string") entry.token_type = tokens.token_type;
      return entry;
    }

    if (typeof prov.access_token === "string") {
      return prov as HermesOAuthEntry;
    }
  }

  return undefined;
}

function resolveHermesAuthPath(): string {
  const hermesHome =
    process.env.HERMES_HOME ||
    process.env.HERMES_AUTH_HOME ||
    join(homedir(), ".hermes");
  if (process.env.HERMES_AUTH_PATH) return process.env.HERMES_AUTH_PATH;
  return join(hermesHome, "auth.json");
}

function readHermesOAuthToken(): string | null {
  try {
    const authPath = resolveHermesAuthPath();
    if (!existsSync(authPath)) return null;

    const raw = readFileSync(authPath, "utf-8");
    const data = JSON.parse(raw);

    const entry = extractHermesOAuthEntry(data);

    if (!entry?.access_token) {
      process.stderr.write("[llm] readHermesOAuthToken: no access_token in auth file\n");
      return null;
    }

    if (entry.expires_at && Date.now() / 1000 > entry.expires_at) {
      frameworkLogger.log(
        "llm-governance",
        "hermes-token-expired",
        "warning",
        { expiresAt: entry.expires_at },
      );
      return null;
    }

    return entry.access_token;
  } catch (err) {
    frameworkLogger.log(
      "llm-governance",
      "hermes-auth-read-error",
      "warning",
      { error: String(err) },
    );
    return null;
  }
}

function getConfig(): {
  endpoint: string;
  apiKey: string;
  model: string;
} | null {
  const directEndpoint =
    process.env.XRAY_LLM_ENDPOINT ||
    process.env.XRAY_GOVERNANCE_LLM_ENDPOINT ||
    "";
  const directApiKey =
    process.env.XRAY_LLM_API_KEY ||
    process.env.XRAY_GOVERNANCE_LLM_API_KEY ||
    "";
  const directModel =
    process.env.XRAY_LLM_MODEL ||
    process.env.XRAY_GOVERNANCE_LLM_MODEL ||
    "gpt-4o";
  // First try: direct env-var config (highest priority)
  const directEnabled =
    process.env.XRAY_GOVERNANCE_LLM_ENABLED === "true" ||
    process.env.XRAY_LLM_ENABLED === "true";

  if (directEnabled && directEndpoint && directApiKey) {
    return { endpoint: directEndpoint, apiKey: directApiKey, model: directModel };
  }

  // Second try: Hermes xAI OAuth token from ~/.hermes/auth.json
  const hermesToken = readHermesOAuthToken();
  if (hermesToken) {
    frameworkLogger.log(
      "llm-governance",
      "using-hermes-oauth",
      "info",
      { provider: "xai-oauth", endpoint: XAI_ENDPOINT, model: XAI_MODEL },
    );
    return { endpoint: XAI_ENDPOINT, apiKey: hermesToken, model: XAI_MODEL };
  }

  // Third try: direct endpoint even without explicit enable flag (if endpoint+key set)
  if (directEndpoint && directApiKey) {
    return { endpoint: directEndpoint, apiKey: directApiKey, model: directModel };
  }

  if (process.env.DEBUG_LLM) {
    process.stderr.write("[llm-debug] No config found. directEnabled=" + directEnabled + " endpoint=" + !!directEndpoint + " apiKey=" + !!directApiKey + " hermes=" + !!hermesToken + "\n");
  }
  return null;
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

export async function tryLLMGovernance(
  role: GovernanceRole,
  proposalTitle: string,
  proposalDescription: string,
  evidence: string[],
  proposalType: string,
): Promise<GovernanceVote | null> {
  const config = getConfig();

  if (!config) {
    process.stderr.write("[llm] no config for role=" + role + "\n");
    return null;
  }
  process.stderr.write("[llm] using config endpoint=" + config.endpoint + " model=" + config.model + "\n");

  const systemPrompt = ROLE_PROMPTS[role];
  const userMessage = `## Proposal

**Title:** ${proposalTitle}

**Description:** ${proposalDescription}

**Type:** ${proposalType}

${evidence.length > 0 ? `**Supporting Evidence:**\n${evidence.map((e, i) => `${i + 1}. ${e}`).join("\n")}` : ""}

---

Please provide your structured vote.`;

  try {
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
    const content = message?.content as string | undefined;

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
  const config = getConfig();
  if (!config) {
    const hermesPath = resolveHermesAuthPath();
    if (existsSync(hermesPath)) {
      return {
        configured: false,
        error:
          "Hermes auth file found but no valid xai-oauth token. Run: hermes auth add xai-oauth --no-browser",
      };
    }
    return {
      configured: false,
      error:
        "No Hermes auth file found (~/.hermes/auth.json). Install Hermes and run: hermes auth add xai-oauth --no-browser",
    };
  }
  return {
    configured: true,
    endpoint: XAI_ENDPOINT,
    model: XAI_MODEL,
  };
}
