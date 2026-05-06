#!/usr/bin/env node
// Reflection Governance Pipeline

import { ValidatorRegistry } from '../../src/enforcement/validators/validator-registry.js';
import { getCodexContext } from '../../src/core/context-loader.js';
import { startTrace, endTrace } from '../../src/core/trace-context.js';

const validatorRegistry = new ValidatorRegistry();

export async function validateReflectionGovernance(reflectionContent, metadata = {}) {
  const trace = startTrace('reflection-governance', metadata);
  const codexContext = await getCodexContext();

  const result = await validatorRegistry.validate({
    type: 'reflection-governance',
    content: reflectionContent,
    metadata: { ...metadata, traceId: trace.traceId, timestamp: new Date().toISOString() },
    codexContext
  });

  if (!result.valid) {
    endTrace(false);
    throw new Error(`Reflection governance violation: ${result.violations?.map(v => v.message).join(', ') || 'unknown'}`);
  }

  endTrace(true);
  return { approved: true, traceId: trace.traceId, validatedAt: new Date().toISOString() };
}