/**
 * Routing Module
 *
 * Barrel exports for routing components extracted from task-skill-router.ts
 * Phase 3 refactoring - Matching Logic Extraction
 *
 * @example
 * ```typescript
 * import { 
 *   RouterCore, 
 *   KeywordMatcher, 
 *   HistoryMatcher, 
 *   ComplexityRouter 
 * } from './routing/index.js';
 * ```
 */

// Interfaces
export * from './interfaces.js';

// Core routing components
export { KeywordMatcher } from './keyword-matcher.js';
export { HistoryMatcher } from './history-matcher.js';
export { ComplexityRouter } from './complexity-router.js';
export { RouterCore } from './router-core.js';

// Re-export types from config for convenience
export type { 
  RoutingMapping, 
  RoutingResult, 
  RoutingOptions 
} from '../config/types.js';
