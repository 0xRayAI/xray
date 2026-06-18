#!/usr/bin/env node
/**
 * Live TaskHandler + Repertoire ingestFeedback session.
 *
 * Proves the cross-system loop without mocks on the memory provider:
 *   features.json → Repertoire provider → TaskHandler → ingestFeedback → registry
 *
 * Run from xray repo root:
 *   npm run live-feedback-session
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const XRAY_ROOT = resolve(__dirname, '..');
const REPERTOIRE_ROOT = resolve(XRAY_ROOT, '..', 'repertoire');

const TRAP_TASK_DESCRIPTION =
  'TYPE: ontological-trap attestation-as-map consumer-boundary revalidation required';

const SIGNAL = 'attestation-as-map';

interface SignalSnapshot {
  avg_confidence: number | null;
  feedback_outcome_count: number;
  feedback_success_count: number;
}

function loadSignalSnapshot(): SignalSnapshot {
  const path = join(REPERTOIRE_ROOT, 'data', 'curated_signals.json');
  const data = JSON.parse(readFileSync(path, 'utf8')) as {
    signals: Array<{
      name: string;
      observation_stats?: { avg_confidence?: number };
      feedback_stats?: { outcome_count?: number; success_count?: number };
    }>;
  };
  const signal = data.signals.find((entry) => entry.name === SIGNAL);
  return {
    avg_confidence: signal?.observation_stats?.avg_confidence ?? null,
    feedback_outcome_count: signal?.feedback_stats?.outcome_count ?? 0,
    feedback_success_count: signal?.feedback_stats?.success_count ?? 0,
  };
}

function countFeedbackLogLines(): number {
  const today = new Date().toISOString().split('T')[0];
  const candidates = [
    join(REPERTOIRE_ROOT, 'logs', 'orchestrator-feedback', `${today}.jsonl`),
    join(XRAY_ROOT, 'logs', 'orchestrator-feedback', `${today}.jsonl`),
  ];
  let total = 0;
  for (const logFile of candidates) {
    if (!existsSync(logFile)) continue;
    total += readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).length;
  }
  return total;
}

async function main(): Promise<void> {
  process.chdir(XRAY_ROOT);

  const before = loadSignalSnapshot();
  const feedbackLinesBefore = countFeedbackLogLines();
  const sessionId = `live-taskhandler-${Date.now()}`;

  console.log('=== Live TaskHandler + Repertoire Feedback Session ===');
  console.log(`xray root:       ${XRAY_ROOT}`);
  console.log(`repertoire root: ${REPERTOIRE_ROOT}`);
  console.log(`sessionId:       ${sessionId}`);
  console.log('');
  console.log('Before:');
  console.log(`  ${SIGNAL} avg_confidence: ${before.avg_confidence}`);
  console.log(`  feedback outcomes: ${before.feedback_outcome_count}`);
  console.log(`  feedback log lines (today): ${feedbackLinesBefore}`);
  console.log('');

  const { getMemoryRoutingProvider, resetMemoryRoutingProvider } = await import(
    '../src/memory-routing/provider-registry.js'
  );
  resetMemoryRoutingProvider();
  const provider = await getMemoryRoutingProvider(true);

  console.log(`Provider loaded: ${provider.id} (${provider.name})`);
  if (provider.id === 'null') {
    console.error('FATAL: Repertoire provider did not load. Check .xray/features.json memory_routing.');
    process.exit(1);
  }

  const trapConfidence = provider.getTaskConfidence?.({
    id: 'live-trap-routing-1',
    description: TRAP_TASK_DESCRIPTION,
    type: 'governance',
  });

  console.log('');
  console.log('Pre-orchestration confidence:');
  console.log(`  highConfidenceTrapPresent: ${trapConfidence?.highConfidenceTrapPresent}`);
  console.log(`  recommendedAgent: ${trapConfidence?.recommendedAgent}`);
  console.log(`  matchedSignals: ${trapConfidence?.matchedSignals?.join(', ')}`);
  console.log('');

  const { TaskHandler } = await import('../src/mcps/orchestrator/handlers/task-handler.js');
  const handler = new TaskHandler();

  const response = await handler.handleOrchestrateTask(
    {
      description: 'Live trap-aware governance orchestration',
      sessionId,
      executionMode: 'optimized',
      tasks: [
        {
          id: 'live-trap-routing-1',
          description: TRAP_TASK_DESCRIPTION,
          type: 'governance',
          estimatedComplexity: 45,
        },
      ],
    },
    { taskHistory: [], activeTasks: new Map() },
  );

  const responseText = response.content[0]?.text ?? '';
  const assignedArchitect =
    responseText.includes('• architect:') || /\barchitect:live-trap-routing-1\b/.test(responseText);
  const orchestrationSuccess = responseText.includes('SUCCESS') || responseText.includes('COMPLETED');

  if (trapConfidence?.recommendedAgent === 'architect' && !assignedArchitect) {
    console.error('FATAL: recommendedAgent is architect but orchestration assigned a different agent.');
    process.exit(1);
  }

  const after = loadSignalSnapshot();
  const feedbackLinesAfter = countFeedbackLogLines();

  const report = {
    timestamp: new Date().toISOString(),
    sessionId,
    providerId: provider.id,
    trapConfidence: {
      highConfidenceTrapPresent: trapConfidence?.highConfidenceTrapPresent ?? false,
      recommendedAgent: trapConfidence?.recommendedAgent ?? null,
      matchedSignals: trapConfidence?.matchedSignals ?? [],
    },
    orchestration: {
      assignedArchitect,
      success: orchestrationSuccess,
      responsePreview: responseText.slice(0, 600),
    },
    signalDelta: {
      signal: SIGNAL,
      avg_confidence_before: before.avg_confidence,
      avg_confidence_after: after.avg_confidence,
      feedback_outcomes_before: before.feedback_outcome_count,
      feedback_outcomes_after: after.feedback_outcome_count,
      feedback_log_lines_before: feedbackLinesBefore,
      feedback_log_lines_after: feedbackLinesAfter,
    },
    verdict:
      after.feedback_outcome_count > before.feedback_outcome_count &&
      after.avg_confidence !== null &&
      before.avg_confidence !== null
        ? 'PASS'
        : 'FAIL',
  };

  const reportDir = join(REPERTOIRE_ROOT, 'logs');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, 'live-taskhandler-session.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log('Orchestration response (excerpt):');
  console.log(responseText.slice(0, 500));
  console.log('');
  console.log('After:');
  console.log(`  ${SIGNAL} avg_confidence: ${before.avg_confidence} → ${after.avg_confidence}`);
  console.log(
    `  feedback outcomes: ${before.feedback_outcome_count} → ${after.feedback_outcome_count}`,
  );
  console.log(`  feedback log lines (today): ${feedbackLinesBefore} → ${feedbackLinesAfter}`);
  console.log('');
  console.log(`Verdict: ${report.verdict}`);
  console.log(`Report: ${reportPath}`);

  if (report.verdict !== 'PASS') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});