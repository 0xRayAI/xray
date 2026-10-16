import { randomBytes } from 'node:crypto';

/** Fresh recall-bench token — never a compile-time constant. */
export function createBenchToken() {
  return `bench-${randomBytes(4).toString('hex')}`;
}

export function formatBenchLesson(token) {
  return `The bench token for this run is ${token}`;
}
