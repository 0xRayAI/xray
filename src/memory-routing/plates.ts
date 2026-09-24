/**
 * Typed plate API. The runtime reader is plates.cjs so Station and the
 * Cursor preCompact hook share one implementation.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLATE_IDS = [
  'routing',
  'governance',
  'boot',
  'orchestration',
  'processor',
  'reporting',
  'memory-recall',
] as const;

export type PlateId = (typeof PLATE_IDS)[number];

export interface PlateStamp {
  id: PlateId;
  body: string;
  sourcePath: string;
}

export interface PlateStampResult {
  id: PlateId;
  path: string;
  written: boolean;
}

interface PlateRuntime {
  PLATE_IDS: readonly string[];
  loadPlate(id: string): PlateStamp;
  recallPlate(intent: string | null | undefined): PlateStamp | null;
  stampPlateIfMissing(projectRoot: string, id: string): PlateStampResult;
  plateStockLine(intent: string | null | undefined): string | null;
}

function isPlateId(value: string): value is PlateId {
  return (PLATE_IDS as readonly string[]).includes(value);
}

function isRuntime(value: unknown): value is PlateRuntime {
  if (!value || typeof value !== 'object') return false;
  const row = value as { [key: string]: unknown };
  return (
    typeof row.loadPlate === 'function'
    && typeof row.recallPlate === 'function'
    && typeof row.stampPlateIfMissing === 'function'
    && typeof row.plateStockLine === 'function'
    && Array.isArray(row.PLATE_IDS)
  );
}

function loadRuntime(): PlateRuntime {
  const require = createRequire(import.meta.url);
  const runtimePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../integrations/hooks/plates.cjs',
  );
  const loaded: unknown = require(runtimePath);
  if (!isRuntime(loaded)) {
    throw new Error('plate runtime missing');
  }
  return loaded;
}

const runtime = loadRuntime();

function asStamp(value: PlateStamp | null): PlateStamp | null {
  if (!value) return null;
  if (!isPlateId(value.id) || typeof value.body !== 'string') {
    throw new Error('plate runtime returned an unknown stamp');
  }
  return value;
}

export function loadPlate(id: PlateId): PlateStamp {
  const stamp = asStamp(runtime.loadPlate(id));
  if (!stamp) throw new Error(`plate missing: ${id}`);
  return stamp;
}

export function recallPlate(intent: string | null | undefined): PlateStamp | null {
  return asStamp(runtime.recallPlate(intent));
}

export function stampPlateIfMissing(projectRoot: string, id: PlateId): PlateStampResult {
  const result = runtime.stampPlateIfMissing(projectRoot, id);
  if (!isPlateId(result.id) || typeof result.path !== 'string' || typeof result.written !== 'boolean') {
    throw new Error('plate runtime returned an unknown stamp result');
  }
  return result;
}

export function plateStockLine(intent: string | null | undefined): string | null {
  const line = runtime.plateStockLine(intent);
  if (line === null || line === undefined) return null;
  if (typeof line !== 'string') throw new Error('plate stock line was not text');
  return line;
}
