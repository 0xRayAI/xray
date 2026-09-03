import path from "path";
import { createRequire } from "module";
import { frameworkLogger } from "../../core/framework-logger.js";

const require = createRequire(import.meta.url);
const packageRoot = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");

/** Re-apply mill overlay after CLI re-wear copies mill skills. */
export function mintAfterWear(targetDir: string): void {
  const { mintConsumerSuit } = require(path.join(packageRoot, "scripts/foundry/mint-suit.cjs")) as {
    mintConsumerSuit: (
      mill: string,
      target: string,
      log?: (component: string, action: string, status: string, details?: unknown) => void,
    ) => { skipped?: boolean };
  };
  mintConsumerSuit(packageRoot, targetDir, (component, action, status, details) => {
    const level = status === "error" ? "error" : "info";
    frameworkLogger.log(component, action, level, details);
  });
}
