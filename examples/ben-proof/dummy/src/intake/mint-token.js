import { randomBytes } from "node:crypto";

/** Runtime bench token — never bake into source constants. */
export function mintBenchToken() {
  return `bench-${randomBytes(16).toString("hex")}`;
}
