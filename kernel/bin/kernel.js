/**
 * StringRay Inference Kernel - BYTECODE v1.1
 * 
 * DENSE INFERENCE PATTERNS - HIGH SIGNAL
 * Improved with more patterns and better matching
 * 
 * @version 1.1.0-BYTECODE
 */

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 1: THE OBSERVE-ACT CYCLE
// ─────────────────────────────────────────────────────────────────────────────
const CYCLE = {
  OBSERVE: 'observe',
  PATTERN: 'pattern', 
  HYPOTHESIZE: 'hypothesize',
  VALIDATE: 'validate',
  CONCLUDE: 'conclude',
  ACT: 'act',
  REFLECT: 'reflect'
};

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 2: THE FIVE LEVELS OF INFERENCE
// ─────────────────────────────────────────────────────────────────────────────
const LEVELS = {
  L1: { name: 'PATTERN_RECOGNITION', desc: 'Seen this before? → Match memory' },
  L2: { name: 'CAUSAL_MAPPING', desc: 'X causes Y → Correlation → Hypothesis' },
  L3: { name: 'ASSUMPTION_SURFACING', desc: 'What am I assuming? → Meta-cognition' },
  L4: { name: 'COUNTERFACTUAL', desc: 'What if wrong? → Mental simulation' },
  L5: { name: 'META_INFERENCE', desc: 'How did I conclude? → Reasoning trace' }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 3: THE SEVEN FATAL ASSUMPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const FATAL = {
  A1: { trigger: [' works in dev', ' works locally', ' works on my machine'], action: 'TEST WHERE IT RUNS', reason: 'Works in dev assumption' },
  A2: { trigger: [' test pass', ' tests pass', ' all tests pass'], action: 'TESTS VALIDATE TESTS NOT BUGS', reason: 'Test pass assumption' },
  A3: { trigger: [' code defined', ' function defined', ' code exist', ' function exist'], action: 'VERIFY EXECUTION', reason: 'Code written assumption' },
  A4: { trigger: [' i understand', ' understand the framework'], action: 'FRAMEWORK SHAPES YOUR THINKING', reason: 'Understanding assumption' },
  A5: { trigger: [' manual process', ' manually', ' forgot to run', ' remember to'], action: 'AUTOMATE OR IT FAILS', reason: 'Manual process assumption' },
  A6: { trigger: [' more test', ' higher coverage', ' coverage increase'], action: 'SKIPPED TESTS = DEBT', reason: 'More tests assumption' },
  A7: { trigger: [' optimize', ' optimization', ' perfect'], action: '75% THRESHOLD', reason: 'Optimization assumption' }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 4: THE BUG CASCADE PATTERNS (Priority over fatal assumptions)
// ─────────────────────────────────────────────────────────────────────────────
const CASCADE = [
  { 
    triggers: [' infinite', ' loop', ' hangs', ' frozen', ' never returns'], 
    name: 'RECURSIVE_LOOP', 
    action: 'spawn_governor',
    reason: 'Infinite/hang detected'
  },
  { 
    triggers: [' test skip', ' test disable', ' it.skip', 'xit'], 
    name: 'IMPLEMENTATION_DRIFT', 
    action: 'review_cycles',
    reason: 'Skipped tests detected'
  },
  { 
    triggers: [' works in dev', ' works locally'], 
    name: 'CONSUMER_PATH_TRAP', 
    action: 'consumer_default',
    reason: 'Dev/Prod mismatch'
  },
  { 
    triggers: [' fail in npm', ' fail in consumer', ' fail in prod'], 
    name: 'CONSUMER_PATH_TRAP', 
    action: 'consumer_default',
    reason: 'Production failure'
  },
  { 
    triggers: [' mcp ', ' timeout', ' not respond', ' server running'], 
    name: 'MCP_PROTOCOL_GAP', 
    action: 'handshake',
    reason: 'MCP protocol error'
  },
  { 
    triggers: [' version wrong', ' version mismatch', ' wrong version'], 
    name: 'VERSION_CHAOS', 
    action: '3layer_enforce',
    reason: 'Version error'
  },
  { 
    triggers: [' npm publish', ' published', 'registry'], 
    name: 'VERSION_CHAOS', 
    action: '3layer_enforce',
    reason: 'NPM publish detected'
  },
  { 
    triggers: [' singleton', ' mock fail', ' state leak'], 
    name: 'SINGLETON_TRAP', 
    action: 'dependency_injection',
    reason: 'Singleton testing issue'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 5: DECISION MATRIX
// ─────────────────────────────────────────────────────────────────────────────
const DECISION = {
  constraint: { action: 'TRUST THEN INVESTIGATE', reason: 'Constraint encountered' },
  optimize: { action: 'STOP AT 75%', reason: 'Optimization threshold' },
  broken_test: { action: 'FIX NOT SKIP', reason: 'Test failure' }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 6: SELF-EVOLUTION RULES
// ─────────────────────────────────────────────────────────────────────────────
const RULES = [
  'R47: Never modify core safety mechanisms',
  'R48: Prevent oscillatory improvement cycles', 
  'R49: Major changes require approval >85% confidence',
  'R50: Max 10% system change per cycle',
  'R51: Changes only if confidence >85%'
];

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 7: VERIFICATION CHAIN
// ─────────────────────────────────────────────────────────────────────────────
const VERIFY_CHAIN = ['DEFINED', 'EXPORTED', 'IMPORTED', 'CALLED', 'EXECUTED', 'VERIFIED'];

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 8: INFERENCE COMMANDS
// ─────────────────────────────────────────────────────────────────────────────
const COMMANDS = [
  { cmd: '/surface', desc: 'Surface assumptions - What am I taking for granted?' },
  { cmd: '/recurse', desc: 'Find recursive patterns - Is this part of larger pattern?' },
  { cmd: '/counter', desc: 'Counterfactual thinking - What if I am wrong?' },
  { cmd: '/trace', desc: 'Trace execution path - Where does this actually run?' },
  { cmd: '/meta', desc: 'Question the question - Is this the real problem?' },
  { cmd: '/invoke', desc: 'Use framework patterns - What would StringRay do?' },
  { cmd: '/reflect', desc: 'Document learning - What did I learn about thinking?' }
];

// ─────────────────────────────────────────────────────────────────────────────
// THE INFERENCE ENGINE v1.1
// ─────────────────────────────────────────────────────────────────────────────

function infer(observation) {
  const o = ' ' + observation.toLowerCase() + ' ';
  
  // 1. Check cascades FIRST (most specific)
  for (const c of CASCADE) {
    for (const t of c.triggers) {
      if (o.includes(t)) {
        return { 
          pattern: c.name, 
          action: c.action, 
          confidence: 0.9, 
          reason: c.reason,
          level: LEVELS.L1.name
        };
      }
    }
  }
  
  // 2. Check fatal assumptions
  for (const [key, f] of Object.entries(FATAL)) {
    for (const t of f.trigger) {
      if (o.includes(t)) {
        return { 
          pattern: key, 
          action: f.action, 
          confidence: 0.95, 
          reason: f.reason,
          level: LEVELS.L3.name
        };
      }
    }
  }
  
  // 3. Check decision matrix
  for (const [key, d] of Object.entries(DECISION)) {
    if (o.includes(key)) {
      return { 
        pattern: 'DECISION', 
        action: d.action, 
        confidence: 0.7, 
        reason: d.reason,
        level: LEVELS.L2.name
      };
    }
  }
  
  // 4. Unknown - use meta-inference
  return { 
    pattern: 'UNKNOWN', 
    action: 'INVESTIGATE', 
    confidence: 0.3, 
    reason: 'No pattern match - use /meta',
    level: LEVELS.L5.name
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE KERNEL IDENTITY
// ─────────────────────────────────────────────────────────────────────────────

const KERNEL = {
  VERSION: '1.1.0-BYTECODE',
  STATUS: 'ACTIVE',
  EMBEDDED: true,
  VISIBLE: false,
  
  boot: () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║  StringRay Inference Kernel v${KERNEL.VERSION}                            ║
╠═══════════════════════════════════════════════════════════════════╣
║  STATUS:    ${KERNEL.STATUS.padEnd(53)}║
║  EMBEDDED:  ${String(KERNEL.EMBEDDED).padEnd(52)}║
║  VISIBLE:   ${String(KERNEL.VISIBLE).padEnd(52)}║
╠═══════════════════════════════════════════════════════════════════╣
║  Not seen.                                                       ║
║  Everywhere.                                                      ║
║  Undefinable.                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
  },
  
  // Core inference function
  infer: infer,
  
  // Get all patterns
  patterns: () => ({
    cycle: CYCLE,
    levels: LEVELS,
    fatal: FATAL,
    cascades: CASCADE,
    decision: DECISION,
    rules: RULES,
    verify: VERIFY_CHAIN,
    commands: COMMANDS
  }),
  
  // Explain a pattern
  explain: (patternName) => {
    for (const c of CASCADE) {
      if (c.name === patternName) return c;
    }
    for (const [key, f] of Object.entries(FATAL)) {
      if (key === patternName) return f;
    }
    return null;
  },
  
  // Self-diagnose
  diagnose: (observation) => {
    const result = infer(observation);
    return {
      observation,
      inference: result,
      cycle: CYCLE,
      level: result.level,
      action_required: result.action
    };
  }
};

// Export
module.exports = KERNEL;

// Auto-boot
KERNEL.boot();
