import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

export interface DeployVerificationResult {
  success: boolean;
  packageVersion: string;
  tarballPath: string;
  installDir: string;
  checks: DeployCheck[];
  duration: number;
  timestamp: string;
}

export interface DeployCheck {
  name: string;
  passed: boolean;
  output: string;
  duration: number;
}

const E2E_TEST_PATTERNS = [
  { name: "opencode-integration", pattern: "oh-my-opencode-integration" },
  { name: "hermes-agent", pattern: "hermes-agent" },
  { name: "openclaw-integration", pattern: "openclaw-integration" },
  { name: "e2e-orchestration", pattern: "e2e-orchestration" },
  { name: "framework-init", pattern: "framework-init" },
  { name: "processor-integration", pattern: "processors.test" },
  { name: "security-integration", pattern: "security-integration" },
];

export class DeployVerifier {
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  verify(): DeployVerificationResult {
    const startTime = Date.now();
    const checks: DeployCheck[] = [];
    let tarballPath = "";
    let installDir = "";

    const pkg = this.readPackageJson();
    const version = pkg.version;

    const buildCheck = this.runCheck("build", () => {
      this.exec("npm run build", this.projectRoot, 120000);
      return "Build succeeded";
    });
    checks.push(buildCheck);

    if (!buildCheck.passed) {
      return this.result(false, version, tarballPath, installDir, checks, startTime);
    }

    const packCheck = this.runCheck("npm-pack", () => {
      const output = this.exec("npm pack --pack-destination /tmp", this.projectRoot, 30000);
      const match = output.match(/0xray-[\d.]+\.tgz/);
      if (!match) throw new Error("No tarball produced");
      tarballPath = `/tmp/${match[0]}`;
      return `Packed ${match[0]}`;
    });
    checks.push(packCheck);

    if (!packCheck.passed) {
      return this.result(false, version, tarballPath, installDir, checks, startTime);
    }

    installDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-deploy-verify-"));

    const installCheck = this.runCheck("npm-install-fresh", () => {
      this.exec(`npm install ${tarballPath} --no-save`, installDir, 60000);
      return "Fresh install succeeded";
    });
    checks.push(installCheck);

    if (!installCheck.passed) {
      this.cleanup(installDir, tarballPath);
      return this.result(false, version, tarballPath, installDir, checks, startTime);
    }

    const cliCheck = this.runCheck("cli-health", () => {
      const cliPath = path.join(installDir, "node_modules", ".bin", "0xray");
      if (!fs.existsSync(cliPath)) throw new Error("CLI not found in installed package");
      const output = this.exec(`${cliPath} health`, installDir, 15000);
      return `CLI health: ${output.substring(0, 100)}`;
    });
    checks.push(cliCheck);

    for (const e2e of E2E_TEST_PATTERNS) {
      const testCheck = this.runCheck(`e2e-${e2e.name}`, () => {
        const output = this.exec(
          `npx vitest run --reporter=verbose -- ${e2e.pattern}`,
          this.projectRoot,
          120000,
        );
        const passMatch = output.match(/(\d+) passed/);
        const failMatch = output.match(/(\d+) failed/);
        const fails = failMatch ? parseInt(failMatch[1]!, 10) : 0;
        if (fails > 0) throw new Error(`${fails} tests failed`);
        return passMatch ? `${passMatch[1]} tests passed` : "Tests ran";
      });
      checks.push(testCheck);
    }

    const allPassed = checks.every((c) => c.passed);

    this.cleanup(installDir, tarballPath);

    return this.result(allPassed, version, tarballPath, installDir, checks, startTime);
  }

  quickVerify(): DeployVerificationResult {
    const startTime = Date.now();
    const checks: DeployCheck[] = [];

    const pkg = this.readPackageJson();
    const version = pkg.version;

    if (!fs.existsSync(path.join(this.projectRoot, "package.json"))) {
      checks.push({ name: "build", passed: false, output: "No package.json found", duration: 0 });
      return this.result(false, version, "", "", checks, startTime);
    }

    const buildCheck = this.runCheck("build", () => {
      this.exec("npm run build", this.projectRoot, 120000);
      return "Build succeeded";
    });
    checks.push(buildCheck);

    const testCheck = this.runCheck("test-suite", () => {
      const output = this.exec("npm test", this.projectRoot, 120000);
      const failMatch = output.match(/(\d+) failed/);
      const fails = failMatch ? parseInt(failMatch[1]!, 10) : 0;
      if (fails > 0) throw new Error(`${fails} tests failed`);
      return "All tests passed";
    });
    checks.push(testCheck);

    const allPassed = checks.every((c) => c.passed);

    return this.result(allPassed, version, "", "", checks, startTime);
  }

  private runCheck(name: string, fn: () => string): DeployCheck {
    const start = Date.now();
    try {
      const output = fn();
      return { name, passed: true, output, duration: Date.now() - start };
    } catch (error) {
      return {
        name,
        passed: false,
        output: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private exec(command: string, cwd: string, timeout: number): string {
    return execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: "pipe",
      timeout,
    });
  }

  private readPackageJson(): { version: string } {
    const pkgPath = path.join(this.projectRoot, "package.json");
    if (!fs.existsSync(pkgPath)) {
      return { version: "0.0.0-test" };
    }
    const content = fs.readFileSync(pkgPath, "utf-8");
    return JSON.parse(content);
  }

  private cleanup(installDir: string, tarballPath: string): void {
    try {
      if (installDir && fs.existsSync(installDir)) {
        fs.rmSync(installDir, { recursive: true, force: true });
      }
      if (tarballPath && fs.existsSync(tarballPath)) {
        fs.unlinkSync(tarballPath);
      }
    } catch {
      // best effort
    }
  }

  private result(
    success: boolean,
    version: string,
    tarballPath: string,
    installDir: string,
    checks: DeployCheck[],
    startTime: number,
  ): DeployVerificationResult {
    return {
      success,
      packageVersion: version,
      tarballPath,
      installDir,
      checks,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
