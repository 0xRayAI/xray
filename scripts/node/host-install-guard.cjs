/**
 * Install-time writes must not change a host git checkout.
 * Tracked files stay byte for byte. A new file is written only when git
 * already ignores it (for example node_modules/ or .xray/state/). Anything
 * else waits for an explicit wear or setup command.
 * Outside a git checkout, install writes as before.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

let depth = 0;
let saved = null;

function gitTop(start) {
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: start,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return top || null;
  } catch {
    return null;
  }
}

function inRepo(top, dest) {
  if (typeof dest !== "string" || dest.length === 0) return null;
  const abs = path.resolve(dest);
  const rel = path.relative(top, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  if (rel === ".git" || rel.startsWith(`.git${path.sep}`)) return null;
  return abs;
}

function gitOk(top, args) {
  try {
    execFileSync("git", args, { cwd: top, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isTracked(top, abs) {
  const rel = path.relative(top, abs);
  return gitOk(top, ["ls-files", "--error-unmatch", "--", rel]);
}

function isIgnored(top, abs) {
  return gitOk(top, ["check-ignore", "-q", "--", abs]);
}

function refuseCreate(top, dest) {
  const abs = inRepo(top, dest);
  if (!abs) return false;
  if (isTracked(top, abs)) return true;
  if (isIgnored(top, abs)) return false;
  return true;
}

function applyPatch(top) {
  if (saved) return;
  saved = {
    writeFileSync: fs.writeFileSync,
    appendFileSync: fs.appendFileSync,
    copyFileSync: fs.copyFileSync,
    cpSync: fs.cpSync,
    symlinkSync: fs.symlinkSync,
    linkSync: fs.linkSync,
  };
  fs.writeFileSync = function writeFileSync(file, ...rest) {
    if (refuseCreate(top, file)) return undefined;
    return saved.writeFileSync.call(fs, file, ...rest);
  };
  fs.appendFileSync = function appendFileSync(file, ...rest) {
    if (refuseCreate(top, file)) return undefined;
    return saved.appendFileSync.call(fs, file, ...rest);
  };
  fs.copyFileSync = function copyFileSync(src, dest, ...rest) {
    if (refuseCreate(top, dest)) return undefined;
    return saved.copyFileSync.call(fs, src, dest, ...rest);
  };
  fs.cpSync = function cpSync(src, dest, ...rest) {
    if (refuseCreate(top, dest)) return undefined;
    return saved.cpSync.call(fs, src, dest, ...rest);
  };
  fs.symlinkSync = function symlinkSync(target, dest, ...rest) {
    if (refuseCreate(top, dest)) return undefined;
    return saved.symlinkSync.call(fs, target, dest, ...rest);
  };
  fs.linkSync = function linkSync(existing, dest) {
    if (refuseCreate(top, dest)) return undefined;
    return saved.linkSync.call(fs, existing, dest);
  };
}

function restorePatch() {
  if (!saved) return;
  fs.writeFileSync = saved.writeFileSync;
  fs.appendFileSync = saved.appendFileSync;
  fs.copyFileSync = saved.copyFileSync;
  fs.cpSync = saved.cpSync;
  fs.symlinkSync = saved.symlinkSync;
  fs.linkSync = saved.linkSync;
  saved = null;
}

function guardHostInstallWrites(targetDir, fn) {
  const top = gitTop(targetDir);
  if (!top) return fn();
  const outer = depth === 0;
  if (outer) applyPatch(top);
  depth += 1;
  try {
    return fn();
  } finally {
    depth -= 1;
    if (outer) restorePatch();
  }
}

module.exports = {
  guardHostInstallWrites,
  gitTop,
  refuseCreate,
};
