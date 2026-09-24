/**
 * Whether `inference:run` may enter InferenceCycle.
 * A missing key is on: the cycle is how a suit grows memory.
 * Explicit `enabled: false` stays off unless the caller passes force.
 */
export function inferenceRunMayEnter(
  inference: { enabled?: boolean } | undefined,
  force: boolean,
): boolean {
  if (force) return true;
  return inference?.enabled !== false;
}
