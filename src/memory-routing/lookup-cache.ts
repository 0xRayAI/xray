import { statSync } from 'node:fs';
import type { MemoryOrchestrationTask, MemoryRoutingProvider, MemoryTaskConfidence } from './types.js';

/**
 * Parsed organ files stay in memory until size or mtimeNs changes.
 * A confidence lookup otherwise re-reads curated signals and inference
 * state on every call, and copies the registry once per name lookup.
 * The stored value is the object load() returned, so a later save of
 * that object matches the file. A read that races a write is not stored.
 */

interface FileStamp {
  exists: boolean;
  size: number;
  mtimeNs: bigint;
}

interface OrganStore {
  filePath?: unknown;
  load?: () => unknown;
}

const boundStores = new WeakSet<object>();

let cacheHits = 0;
let cacheMisses = 0;

export function resetOrganFileCacheStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
}

export function organFileCacheStats(): { hits: number; misses: number } {
  return { hits: cacheHits, misses: cacheMisses };
}

function stampFile(filePath: string): FileStamp {
  try {
    const info = statSync(filePath) as { size: number; mtimeMs: number; mtimeNs?: bigint };
    const mtimeNs = typeof info.mtimeNs === 'bigint'
      ? info.mtimeNs
      : BigInt(Math.round(info.mtimeMs * 1_000_000));
    return { exists: true, size: info.size, mtimeNs };
  } catch {
    return { exists: false, size: 0, mtimeNs: 0n };
  }
}

function sameStamp(left: FileStamp, right: FileStamp): boolean {
  return left.exists === right.exists
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs;
}

function bindStore(store: unknown): void {
  if (!store || typeof store !== 'object') return;
  if (boundStores.has(store)) return;
  const organ = store as OrganStore;
  const read = organ.load;
  const filePath = organ.filePath;
  if (typeof read !== 'function' || typeof filePath !== 'string' || filePath.length === 0) return;

  boundStores.add(store);
  let filled = false;
  let cached: unknown;
  let stamp: FileStamp | null = null;

  organ.load = () => {
    const before = stampFile(filePath);
    if (filled && stamp && sameStamp(stamp, before)) {
      cacheHits += 1;
      return cached;
    }
    cacheMisses += 1;
    const value = read.call(organ);
    const after = stampFile(filePath);
    if (sameStamp(before, after)) {
      cached = value;
      stamp = after;
      filled = true;
    } else {
      filled = false;
      stamp = null;
    }
    return value;
  };
}

function signalsFilePath(provider: MemoryRoutingProvider): string {
  const signals = (provider as { service?: { signalsManager?: { filePath?: unknown } } }).service?.signalsManager;
  return signals && typeof signals.filePath === 'string' ? signals.filePath : '';
}

function taskStamp(task: MemoryOrchestrationTask): string {
  return `${task.id}\0${task.type}\0${task.description}`;
}

/**
 * Decay uses the wall clock, so two lookups of one unchanged signals file
 * differ in the 11th digit. Repeat the stored confidence until that file changes.
 */
function bindConfidenceMemo(provider: MemoryRoutingProvider): void {
  const original = provider.getTaskConfidence;
  if (typeof original !== 'function') return;
  const filePath = signalsFilePath(provider);
  if (!filePath) return;

  let stamp: FileStamp | null = null;
  let key = '';
  let cached: MemoryTaskConfidence | undefined;

  provider.getTaskConfidence = (task: MemoryOrchestrationTask): MemoryTaskConfidence => {
    const before = stampFile(filePath);
    const nextKey = taskStamp(task);
    if (cached && stamp && sameStamp(stamp, before) && key === nextKey) return cached;
    const value = original.call(provider, task);
    const after = stampFile(filePath);
    if (sameStamp(before, after)) {
      cached = value;
      stamp = after;
      key = nextKey;
    } else {
      cached = undefined;
      stamp = null;
      key = '';
    }
    return value;
  };
}

/** Attach the file cache to a loaded Repertoire provider. Other providers are left alone. */
export function bindOrganFileCache(provider: MemoryRoutingProvider): void {
  const service = (provider as { service?: unknown }).service;
  if (!service || typeof service !== 'object') return;
  const row = service as { signalsManager?: unknown; stateManager?: unknown };
  bindStore(row.signalsManager);
  bindStore(row.stateManager);
  bindConfidenceMemo(provider);
}
