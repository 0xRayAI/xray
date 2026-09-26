import { createMemoryRoutingProvider } from '@0xray/repertoire/provider/memory-routing-provider';
import { loadMemoryRoutingConfig } from './repertoire-config.mjs';

let cached;

export function getOrgan() {
  if (!cached) {
    cached = createMemoryRoutingProvider(loadMemoryRoutingConfig());
  }
  return cached;
}
