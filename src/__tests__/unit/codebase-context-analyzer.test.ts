/**
 * File-cache and module-walk invalidation for CodebaseContextAnalyzer.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import * as os from "os";
import * as path from "path";

const walkGate = vi.hoisted(() => ({
  moduleDir: "",
  lists: 0,
  enabled: false,
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readdirSync(dir: import("fs").PathLike, options?: { withFileTypes?: boolean }) {
      const entries = actual.readdirSync(dir, options as { withFileTypes: true });
      if (walkGate.enabled && path.resolve(String(dir)) === walkGate.moduleDir) {
        walkGate.lists += 1;
        if (walkGate.lists === 1) {
          actual.writeFileSync(
            path.join(walkGate.moduleDir, "added.ts"),
            'import { added } from "./added-dep";\n',
          );
        }
      }
      return entries;
    },
  };
});

import * as fs from "fs";
import { CodebaseContextAnalyzer } from "../../delegation/codebase-context-analyzer.js";

describe("CodebaseContextAnalyzer file identity", () => {
  const roots: string[] = [];

  afterEach(() => {
    walkGate.enabled = false;
    walkGate.moduleDir = "";
    walkGate.lists = 0;
    vi.restoreAllMocks();
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns new imports after a same-millisecond same-size rewrite", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cca-cache-"));
    roots.push(root);
    const file = path.join(root, "mod.ts");
    const beforeBody = 'import { aaa } from "./aaa";\n';
    const afterBody = 'import { bbb } from "./bbb";\n';
    expect(Buffer.byteLength(beforeBody)).toBe(Buffer.byteLength(afterBody));

    fs.writeFileSync(file, beforeBody);
    const stamp = new Date(1_700_000_000_123);
    fs.utimesSync(file, stamp, stamp);
    const beforeStat = fs.statSync(file);

    const analyzer = new CodebaseContextAnalyzer(root, { enableCaching: true });
    const first = await analyzer.analyzeCodebase();
    expect(first.structure.fileGraph.get("mod.ts")?.imports).toEqual(["./aaa"]);

    fs.writeFileSync(file, afterBody);
    fs.utimesSync(file, stamp, stamp);
    const afterStat = fs.statSync(file);
    expect(afterStat.size).toBe(beforeStat.size);
    expect(afterStat.mtime.getTime()).toBe(beforeStat.mtime.getTime());

    const second = await analyzer.analyzeCodebase();
    expect(second.structure.fileGraph.get("mod.ts")?.imports).toEqual(["./bbb"]);
  });

  it("includes a file created after the module listing and before the walk", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cca-walk-"));
    roots.push(root);
    const moduleDir = path.join(root, "pkg");
    fs.mkdirSync(moduleDir);
    fs.writeFileSync(path.join(moduleDir, "package.json"), "{}\n");
    fs.writeFileSync(
      path.join(moduleDir, "index.ts"),
      "export const ready = 1;\n",
    );

    walkGate.moduleDir = moduleDir;
    walkGate.lists = 0;
    walkGate.enabled = true;

    const analyzer = new CodebaseContextAnalyzer(root, { enableCaching: true });
    const analysis = await analyzer.analyzeCodebase();
    expect(walkGate.lists).toBeGreaterThanOrEqual(2);

    const moduleInfo = analysis.structure.modules.get("pkg");
    const added = moduleInfo?.files.find((file) =>
      file.relativePath.endsWith("added.ts"),
    );
    expect(added).toBeDefined();
    expect(added?.imports).toContain("./added-dep");
  });
});
