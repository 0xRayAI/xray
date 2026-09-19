import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const millDir = path.dirname(fileURLToPath(import.meta.url));

export function millPackageDir() {
  return millDir;
}

export function millScript(basename) {
  return path.join(millDir, basename);
}

/** Repo being milled: FOUNDRY_ROOT, else cwd. Not this package's __dirname. */
export function resolveMillRoot() {
  const env = process.env.FOUNDRY_ROOT;
  if (typeof env === "string" && env.trim()) {
    return path.resolve(env.trim());
  }
  return process.cwd();
}

/**
 * Git hook installer. Dogfood is `scripts/hooks` next to `scripts/foundry`.
 * Published mill lives in `node_modules/@0xray/foundry` — sibling `@0xray/hooks`
 * does not exist. Use the worn 0xray installer instead.
 */
export function resolveHookInstaller(rootDir = resolveMillRoot(), millPkg = millPackageDir()) {
  const candidates = [
    path.join(millPkg, "..", "hooks", "install-hooks.cjs"),
    path.join(rootDir, "node_modules", "0xray", "scripts", "hooks", "install-hooks.cjs"),
    path.join(rootDir, "scripts", "hooks", "install-hooks.cjs"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

export function readRootPackage(rootDir = resolveMillRoot()) {
  const pkgPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { name: null, version: null, scripts: {} };
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return {
      name: typeof pkg.name === "string" ? pkg.name : null,
      version: typeof pkg.version === "string" ? pkg.version : null,
      scripts: pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {},
    };
  } catch {
    return { name: null, version: null, scripts: {} };
  }
}

export function hasDocsSite(rootDir = resolveMillRoot()) {
  return fs.existsSync(path.join(rootDir, "docs-site"));
}

export function isXrayExoRepo(rootDir = resolveMillRoot()) {
  const pkg = readRootPackage(rootDir);
  return pkg.name === "0xray" && hasDocsSite(rootDir);
}
