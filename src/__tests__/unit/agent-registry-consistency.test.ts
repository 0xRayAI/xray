import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { AGENT_REGISTRY, getActiveAgents, isAllowedAgent } from "../../agents/registry.js";
import { builtinAgents } from "../../agents/index.js";
import { DEFAULT_AGENTS } from "../../config/default-agents.js";

const REGISTRY_NAMES = Object.keys(AGENT_REGISTRY);
const BARREL_NAMES = Object.keys(builtinAgents);
const ACTIVE_NAMES = getActiveAgents();

const ROUTING_MAPPINGS_PATH = path.resolve(
  process.cwd(),
  ".opencode/xray/routing-mappings.json",
);

const OPENCODE_JSON_PATH = path.resolve(process.cwd(), "opencode.json");

describe("Agent Registry Consistency", () => {
  describe("Barrel ↔ Registry parity", () => {
    it("should have matching agent counts between barrel and registry", () => {
      expect(BARREL_NAMES.length).toBe(REGISTRY_NAMES.length);
    });

    it("should have every barrel agent in the registry", () => {
      for (const name of BARREL_NAMES) {
        expect(AGENT_REGISTRY[name]).toBeDefined();
      }
    });

    it("should have every registry agent in the barrel", () => {
      for (const name of REGISTRY_NAMES) {
        expect(builtinAgents[name]).toBeDefined();
      }
    });
  });

  describe("DEFAULT_AGENTS completeness", () => {
    it("should have DEFAULT_AGENTS matching registry", () => {
      // DEFAULT_AGENTS derives from full AGENT_REGISTRY (including deprecated)
      const registryCount = Object.keys(AGENT_REGISTRY).length;
      expect(DEFAULT_AGENTS.length).toBe(registryCount);
    });

    it("should have every DEFAULT_AGENTS entry in registry", () => {
      for (const agent of DEFAULT_AGENTS) {
        expect(AGENT_REGISTRY[agent.name]).toBeDefined();
      }
    });
  });

  describe("ALLOWED_AGENTS completeness", () => {
    it("should accept all active registry agents", () => {
      for (const name of ACTIVE_NAMES) {
        expect(isAllowedAgent(name)).toBe(true);
      }
    });

    it("should reject unknown agents", () => {
      expect(isAllowedAgent("nonexistent-agent")).toBe(false);
    });
  });

  describe("No phantom routing", () => {
    it("should have all routing-mappings agents in registry", () => {
      if (!fs.existsSync(ROUTING_MAPPINGS_PATH)) return;

      const mappings = JSON.parse(fs.readFileSync(ROUTING_MAPPINGS_PATH, "utf-8"));
      const phantomAgents: string[] = [];

      for (const entry of mappings) {
        if (entry.agent && !AGENT_REGISTRY[entry.agent]) {
          phantomAgents.push(entry.agent);
        }
      }

      expect(phantomAgents).toEqual([]);
    });
  });

  describe("Agent files exist on disk", () => {
    it("should have a .ts file for every registry agent", () => {
      const missing: string[] = [];

      for (const name of REGISTRY_NAMES) {
        const filePath = path.resolve(process.cwd(), `src/agents/${name}.ts`);
        if (!fs.existsSync(filePath)) {
          missing.push(name);
        }
      }

      expect(missing).toEqual([]);
    });
  });

  describe("Registry entry completeness", () => {
    it("should have all required fields for every entry", () => {
      const requiredFields: (keyof typeof AGENT_REGISTRY[string])[] = [
        "name",
        "description",
        "capabilities",
        "capacity",
        "specialties",
        "mode",
        "maxComplexity",
        "concurrentTasks",
        "status",
        "performance",
        "expertise",
      ];

      for (const [key, entry] of Object.entries(AGENT_REGISTRY)) {
        for (const field of requiredFields) {
          expect(entry[field]).toBeDefined();
        }

        expect(entry.name).toBe(key);
        expect(Array.isArray(entry.capabilities)).toBe(true);
        expect(entry.capabilities.length).toBeGreaterThan(0);
        expect(["primary", "subagent"]).toContain(entry.mode);
        expect(["active", "inactive"]).toContain(entry.status);
        expect(typeof entry.capacity).toBe("number");
        expect(typeof entry.maxComplexity).toBe("number");
        expect(typeof entry.concurrentTasks).toBe("number");
        expect(typeof entry.performance).toBe("number");
      }
    });
  });

  describe("opencode.json agent parity", () => {
    function getXrayAgentNames(): string[] {
      if (!fs.existsSync(OPENCODE_JSON_PATH)) return [];
      const config = JSON.parse(fs.readFileSync(OPENCODE_JSON_PATH, "utf-8"));
      const allAgents = config.agent || {};
      return Object.entries(allAgents)
        .filter(([name, def]: [string, any]) =>
          !def.disable &&
          !name.startsWith("xray-") &&
          AGENT_REGISTRY[name],
        )
        .map(([name]) => name);
    }

    it("should have every active xray agent in opencode.json present in registry", () => {
      const xrayAgents = getXrayAgentNames();
      if (xrayAgents.length === 0) return;

      for (const name of xrayAgents) {
        expect(AGENT_REGISTRY[name]).toBeDefined();
      }
    });

    it("should have every active registry agent in opencode.json", () => {
      if (!fs.existsSync(OPENCODE_JSON_PATH)) return;

      const config = JSON.parse(fs.readFileSync(OPENCODE_JSON_PATH, "utf-8"));
      const opencodeAgents = Object.keys(config.agent || {});
      const missing: string[] = [];

      // Skip deprecated agents (enforcer, orchestrator) that are no longer in opencode.json
      const DEPRECATED = ["enforcer", "orchestrator"];
      for (const name of REGISTRY_NAMES) {
        if (DEPRECATED.includes(name)) continue;
        if (!opencodeAgents.includes(name)) {
          missing.push(name);
        }
      }

      expect(missing).toEqual([]);
    });
  });
});
