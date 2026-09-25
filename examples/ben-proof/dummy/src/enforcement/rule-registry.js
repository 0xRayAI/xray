/**
 * Minimal rule registry — facade slice from xray rule-enforcer.ts metadata.
 */

/** @typedef {{ id: string; name: string; category: string; severity: string; enabled: boolean }} RuleDefinition */

/** @type {RuleDefinition[]} */
const DEFAULT_RULES = [
  { id: "tests-required", name: "Tests Required", category: "testing", severity: "error", enabled: true },
  { id: "no-over-engineering", name: "No Over-Engineering", category: "architecture", severity: "error", enabled: true },
  { id: "console-log-usage", name: "Console Log Usage", category: "code-quality", severity: "error", enabled: true },
  { id: "security-by-design", name: "Security by Design", category: "security", severity: "error", enabled: true },
  { id: "spawn-governance", name: "Agent Spawn Governance", category: "governance", severity: "blocking", enabled: true },
];

export class RuleRegistry {
  /** @type {Map<string, RuleDefinition>} */
  #rules = new Map();

  constructor(seed = DEFAULT_RULES) {
    for (const rule of seed) this.#rules.set(rule.id, { ...rule });
  }

  addRule(rule) {
    if (this.#rules.has(rule.id)) throw new Error(`Rule ${rule.id} already registered`);
    this.#rules.set(rule.id, rule);
  }

  getRule(id) {
    return this.#rules.get(id);
  }

  getRules() {
    return [...this.#rules.values()];
  }

  enableRule(id) {
    const rule = this.#rules.get(id);
    if (!rule) return false;
    rule.enabled = true;
    return true;
  }

  disableRule(id) {
    const rule = this.#rules.get(id);
    if (!rule) return false;
    rule.enabled = false;
    return false;
  }
}
