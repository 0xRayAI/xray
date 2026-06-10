/**
 * Nucleus Gate Tests (Phase 1F.2)
 *
 * Verifies that all governance path callers (MCP server, SelfProposalEngine,
 * CLI govern command) import handleGovernRequest from the nucleus,
 * establishing "nucleus is the sole governance path" invariant.
 */

import { describe, test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf-8");
}

describe("governance.server.ts → nucleus delegation", () => {
  const source = readSource("src/mcps/governance.server.ts");

  test("imports handleGovernRequest from nucleus", () => {
    expect(source).toMatch(/import.*handleGovernRequest.*nucleus/);
  });

  test("calls handleGovernRequest at runtime", () => {
    const callMatches = source.match(/handleGovernRequest\s*\(/g);
    expect(callMatches).not.toBeNull();
    expect(callMatches!.length).toBeGreaterThanOrEqual(1);
  });

  test("does not import governance-service directly (must go through nucleus)", () => {
    expect(source).not.toMatch(/import.*governance-service/);
  });
});

describe("SelfProposalEngine.ts → nucleus delegation", () => {
  const source = readSource("src/postprocessor/metamorphosis/SelfProposalEngine.ts");

  test("imports handleGovernRequest from nucleus", () => {
    expect(source).toMatch(/import.*handleGovernRequest.*nucleus/);
  });

  test("calls handleGovernRequest at runtime", () => {
    const callMatches = source.match(/handleGovernRequest\s*\(/g);
    expect(callMatches).not.toBeNull();
    expect(callMatches!.length).toBeGreaterThanOrEqual(1);
  });

  test("does not import governance-service directly", () => {
    expect(source).not.toMatch(/import.*governance-service/);
  });
});

describe("govern.ts → nucleus delegation", () => {
  const source = readSource("src/cli/commands/govern.ts");

  test("imports handleGovernRequest from nucleus", () => {
    expect(source).toMatch(/(?:import|handleGovernRequest).*nucleus/);
  });

  test("calls handleGovernRequest at runtime", () => {
    const callMatches = source.match(/handleGovernRequest\s*\(/g);
    expect(callMatches).not.toBeNull();
    expect(callMatches!.length).toBeGreaterThanOrEqual(1);
  });

  test("does not import governance-service directly", () => {
    expect(source).not.toMatch(/import.*governance-service/);
  });
});

describe("Governance surface — the three-caller invariant", () => {
  const callers: Array<{ name: string; file: string }> = [
    { name: "governance.server.ts", file: "src/mcps/governance.server.ts" },
    { name: "SelfProposalEngine.ts", file: "src/postprocessor/metamorphosis/SelfProposalEngine.ts" },
    { name: "govern.ts", file: "src/cli/commands/govern.ts" },
  ];

  for (const { name, file } of callers) {
    test(`${name} imports handleGovernRequest as a value (not just type)`, () => {
      const source = readSource(file);
      const hasStaticImport = source.match(/import\s*\{[^}]*\bhandleGovernRequest\b[^}]*\}\s*from/);
      const hasDynamicImport = source.match(/import\s*\(\s*['"].*nucleus/);
      expect(hasStaticImport || hasDynamicImport).toBeTruthy();
    });
  }
});
