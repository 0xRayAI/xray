/** 0xRay three-subsystem map (Inference · External Governance · Autonomous Engine). */
export const SUBSYSTEMS = Object.freeze({
  inference: {
    label: 'Inference',
    surfaces: ['memory_routing', 'recordLesson', 'Repertoire buildRoutingContext'],
  },
  governance: {
    label: 'External Governance',
    surfaces: ['codex PreToolUse', 'Dynamo Solar SSOT', 'governance MCP'],
  },
  engine: {
    label: 'Autonomous Engine',
    surfaces: ['nucleus scoreAndRoute', 'thinDispatch resolveThinDispatch', 'AsideContext', 'delegation-gate PreToolUse'],
  },
  inferenceHooks: {
    label: 'Inference side effects',
    surfaces: ['recordLesson', 'synthesis checkpoint', 'confer quorum', 'station-memory-ingest'],
  },
});
