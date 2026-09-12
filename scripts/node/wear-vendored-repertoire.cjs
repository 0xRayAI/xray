/**
 * wear-vendored-repertoire.cjs — Materialize @0xray/repertoire from the
 * packed vendor tree. Published 0xray must not ship a `file:` dependency:
 * npm --install-links, pnpm, and yarn resolve that path from the consumer
 * root (ENOENT on vendor/@0xray/repertoire), not from node_modules/0xray.
 */

const fs = require("fs");
const path = require("path");

function resolveVendoredRepertoire(packageRoot) {
  const vendor = path.join(packageRoot, "vendor", "@0xray", "repertoire");
  if (fs.existsSync(path.join(vendor, "package.json"))) return vendor;
  return null;
}

function repertoirePackageName(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    return pkg.name || null;
  } catch {
    return null;
  }
}

function destAlreadyWorn(dest, vendor) {
  try {
    if (!fs.existsSync(path.join(dest, "package.json"))) return false;
    if (repertoirePackageName(dest) !== "@0xray/repertoire") return false;
    return fs.realpathSync(dest) === fs.realpathSync(vendor);
  } catch {
    return false;
  }
}

function destIsUsableRepertoire(dest) {
  return repertoirePackageName(dest) === "@0xray/repertoire";
}

function removeBrokenDest(dest) {
  try {
    const st = fs.lstatSync(dest);
    if (st.isSymbolicLink() && !fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }
  } catch {
    /* dest absent */
  }
}

function wearOne(vendor, dest, log) {
  removeBrokenDest(dest);
  if (destAlreadyWorn(dest, vendor)) return true;
  if (fs.existsSync(dest) && destIsUsableRepertoire(dest)) return true;

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const rel = path.relative(path.dirname(dest), vendor);
  const linkType = process.platform === "win32" ? "junction" : "dir";
  try {
    fs.symlinkSync(rel, dest, linkType);
    return true;
  } catch (linkErr) {
    try {
      fs.cpSync(vendor, dest, { recursive: true });
      return true;
    } catch (copyErr) {
      if (typeof log === "function") {
        log("wear-repertoire", "failed to wear vendored organ", "warning", {
          dest,
          linkError: linkErr.message,
          copyError: copyErr.message,
        });
      }
      return false;
    }
  }
}

function wearDestinations(packageRoot, targetDir) {
  const dests = [path.join(packageRoot, "node_modules", "@0xray", "repertoire")];
  if (targetDir && path.resolve(targetDir) !== path.resolve(packageRoot)) {
    dests.push(path.join(targetDir, "node_modules", "@0xray", "repertoire"));
  }
  return dests;
}

function wearVendoredRepertoire(packageRoot, targetDir, log) {
  const vendor = resolveVendoredRepertoire(packageRoot);
  if (!vendor) return { worn: [], vendor: null };

  const worn = [];
  for (const dest of wearDestinations(packageRoot, targetDir)) {
    if (wearOne(vendor, dest, log)) worn.push(dest);
  }
  if (worn.length && typeof log === "function") {
    log("wear-repertoire", "vendored @0xray/repertoire worn", "info", {
      vendor,
      dests: worn,
    });
  }
  return { worn, vendor };
}

function hasFileProtocolDependency(pkg) {
  const buckets = [pkg.dependencies, pkg.optionalDependencies, pkg.peerDependencies];
  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const spec of Object.values(bucket)) {
      if (String(spec).startsWith("file:")) return true;
    }
  }
  return false;
}

module.exports = {
  resolveVendoredRepertoire,
  wearVendoredRepertoire,
  wearDestinations,
  hasFileProtocolDependency,
};
