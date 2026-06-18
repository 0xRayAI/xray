import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  deployXrayConfig,
  resolveXrayConfigSource,
  XRAY_CONFIG_FILES,
} = require("../../../scripts/node/install-bridges.cjs");

describe("install-bridges xray config deploy", () => {
  let tmpRoot: string;
  let packageRoot: string;
  let consumerRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "0xray-config-deploy-"));
    packageRoot = path.join(tmpRoot, "package");
    consumerRoot = path.join(tmpRoot, "consumer");
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.mkdirSync(consumerRoot, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("resolves config from xray/ when .xray/ is absent", () => {
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({ memory_routing: { enabled: true, provider: "repertoire" } }),
    );

    const resolved = resolveXrayConfigSource(packageRoot, "features.json");
    expect(resolved).toBe(path.join(xrayDir, "features.json"));
  });

  it("deploys features.json and schema from xray/ to consumer .xray/", () => {
    const xrayDir = path.join(packageRoot, "xray");
    fs.mkdirSync(xrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(xrayDir, "features.json"),
      JSON.stringify({
        memory_routing: { enabled: true, provider: "repertoire" },
      }),
    );
    fs.writeFileSync(path.join(xrayDir, "features.schema.json"), "{}");

    const copied = deployXrayConfig(consumerRoot, packageRoot, () => {});
    expect(copied).toBe(2);

    const deployed = JSON.parse(
      fs.readFileSync(path.join(consumerRoot, ".xray", "features.json"), "utf-8"),
    );
    expect(deployed.memory_routing?.provider).toBe("repertoire");
    expect(fs.existsSync(path.join(consumerRoot, ".xray", "features.schema.json"))).toBe(true);
  });

  it("package.json files array ships features config artifacts", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"),
    );
    const files: string[] = pkg.files ?? [];
    for (const rel of [
      "xray/features.json",
      "xray/features.schema.json",
      ".xray/features.json",
      ".xray/features.schema.json",
    ]) {
      expect(files).toContain(rel);
    }
    expect(XRAY_CONFIG_FILES).toContain("features.json");
    expect(XRAY_CONFIG_FILES).toContain("features.schema.json");
  });
});