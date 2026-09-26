import { createRequire } from 'node:module';
import { join } from 'node:path';
import { projectRoot } from './repertoire-config.mjs';

let runtime;

export function getPlatesRuntime() {
  if (runtime) return runtime;
  const require = createRequire(import.meta.url);
  const path = join(
    projectRoot(),
    'node_modules',
    '0xray',
    'dist',
    'integrations',
    'hooks',
    'plates.cjs',
  );
  const loaded = require(path);
  runtime = loaded.recallPlate ? loaded : loaded.default;
  return runtime;
}

export function recallPlateForIntent(intent) {
  try {
    const plates = getPlatesRuntime();
    if (typeof plates.recallPlate !== 'function') return null;
    return plates.recallPlate(intent || '');
  } catch {
    return null;
  }
}
