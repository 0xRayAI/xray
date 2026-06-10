/**
 * Query Routing Tool
 *
 * Lets the main AI discover which agent/skill best matches a task.
 * Combines ROUTING_MAPPINGS keyword lookup with AGENT_REGISTRY metadata.
 */

import {
  queryRoutingMappings,
  getAllRoutingMappings,
  RoutingMatch,
} from "../config/routing-mappings.js";
import {
  getAgentEntry,
  getAgentCapabilities,
  AgentRegistryEntry,
} from "../agents/registry.js";
import { frameworkLogger } from "../core/framework-logger.js";

export interface AgentRoutingDetail {
  agent: string;
  skill: string;
  confidence: number;
  matchedKeywords: string[];
  description: string | undefined;
  capabilities: string[];
  expertise: string | undefined;
}

export function queryRouting(keywords: string[]): AgentRoutingDetail[] {
  const matches: RoutingMatch[] = queryRoutingMappings(keywords);

  const enriched: AgentRoutingDetail[] = matches.map((m) => {
    const entry: AgentRegistryEntry | undefined = getAgentEntry(m.agent);
    return {
      agent: m.agent,
      skill: m.skill,
      confidence: m.confidence,
      matchedKeywords: m.matchedKeywords,
      description: entry?.description,
      capabilities: entry
        ? entry.capabilities
        : getAgentCapabilities(m.agent),
      expertise: entry?.expertise,
    };
  });

  frameworkLogger.log("query-routing-tool", "query-complete", "info", {
    keywords,
    matchCount: enriched.length,
    topMatch: enriched[0]
      ? { agent: enriched[0].agent, confidence: enriched[0].confidence }
      : null,
  });

  return enriched;
}

export function listAllRoutes(): AgentRoutingDetail[] {
  const all = getAllRoutingMappings();
  const seen = new Set<string>();
  const unique: AgentRoutingDetail[] = [];

  for (const mapping of all) {
    const key = `${mapping.agent}:${mapping.skill}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const entry = getAgentEntry(mapping.agent);
    unique.push({
      agent: mapping.agent,
      skill: mapping.skill,
      confidence: mapping.confidence,
      matchedKeywords: mapping.keywords,
      description: entry?.description,
      capabilities: entry
        ? entry.capabilities
        : getAgentCapabilities(mapping.agent),
      expertise: entry?.expertise,
    });
  }

  unique.sort((a, b) => b.confidence - a.confidence);
  return unique;
}
