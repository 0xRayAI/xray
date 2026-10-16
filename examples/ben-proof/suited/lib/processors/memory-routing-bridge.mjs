import { getOrgan } from '../organ.mjs';

export function getProvider() {
  const organ = getOrgan();
  if (!organ.isAvailable()) {
    return { id: 'null' };
  }
  return organ;
}

export function toMemoryTask(task) {
  return {
    id: task.id,
    description: task.description,
    type: task.type,
    priority: task.priority,
    dependencies: task.dependencies,
    estimatedComplexity: task.estimatedComplexity,
    metadata: task.metadata ?? {},
  };
}

export function fromMemoryTask(task) {
  return { ...task };
}

export function toMemoryCapabilityMap(capabilities) {
  const out = {};
  for (const [agent, caps] of capabilities) {
    out[agent] = caps;
  }
  return out;
}

export function fromMemoryCapabilityMap(map) {
  return new Map(Object.entries(map));
}
