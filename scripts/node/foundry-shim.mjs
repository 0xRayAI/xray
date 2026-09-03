import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Run the mill script when this wrapper is the CLI entry. */
export function millMain(importMetaUrl, millBasename) {
  const here = fileURLToPath(importMetaUrl);
  if (!process.argv[1] || path.resolve(process.argv[1]) !== here) {
    return;
  }
  const mill = path.resolve(path.dirname(here), "../foundry", millBasename);
  const result = spawnSync(process.execPath, [mill, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
  process.exit(result.status === null ? 1 : result.status);
}
