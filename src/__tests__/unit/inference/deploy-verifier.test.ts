import { describe, it, expect } from "vitest";
import { DeployVerifier } from "../../../inference/deploy-verifier.js";

describe("Deploy Verifier", () => {
  it("should report build failure for nonexistent project", () => {
    const verifier = new DeployVerifier("/nonexistent/project/path");
    const result = verifier.quickVerify();

    expect(result.success).toBe(false);
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.checks[0]!.passed).toBe(false);
    expect(result.checks[0]!.name).toBe("build");
  });

  it("should include package version from package.json", () => {
    const pkg = (verifier: DeployVerifier) => (verifier as any).readPackageJson();
    const verifier = new DeployVerifier(process.cwd());
    const pkgData = pkg(verifier);

    expect(pkgData.version).toMatch(/\d+\.\d+\.\d+/);
  });

  it("should set timestamp on result", () => {
    const verifier = new DeployVerifier("/nonexistent/project/path");
    const result = verifier.quickVerify();

    expect(result.timestamp).toBeTruthy();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it("should report duration for all checks", () => {
    const verifier = new DeployVerifier("/nonexistent/project/path");
    const result = verifier.quickVerify();

    for (const check of result.checks) {
      expect(check.duration).toBeGreaterThanOrEqual(0);
    }
  });
});
