/**
 * Skills seek. The card list is the prebuilt choice. Plate recall is the live one.
 * A model is not called. A decline is the last tier.
 * Confer on the result is only for a feat or a refactor. This does not start the quorum.
 */

const TASK_TYPE_ROUTES = {
  plan: "strategist",
  architecture: "architect-tools",
  research: "researcher",
  implement: "backend-engineer",
  frontend: "frontend-engineer",
  test: "bug-triage",
  review: "code-review",
  security: "security-audit",
  governance: "enforcer",
};

const CATALOG_POINTERS = new Set(["SKILLS.md", ".agents/skills"]);

export function skillIdsFromRow(skills) {
  const raw = Array.isArray(skills) ? skills.join(",") : String(skills || "");
  const out = [];
  for (const part of raw.split(",")) {
    const token = part.trim();
    if (!token || CATALOG_POINTERS.has(token)) continue;
    const bits = token.split("/").filter(Boolean);
    let id = token;
    if (bits[bits.length - 1] === "SKILL.md" && bits.length >= 2) id = bits[bits.length - 2];
    else if (token.includes("/")) id = bits[bits.length - 1];
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) continue;
    if (out.includes(id)) continue;
    out.push(id);
    if (out.length === 5) break;
  }
  return out;
}

function routeForTask(taskType) {
  const key = String(taskType || "").trim().toLowerCase();
  if (!key || !Object.prototype.hasOwnProperty.call(TASK_TYPE_ROUTES, key)) return "";
  return TASK_TYPE_ROUTES[key];
}

function mentioned(skill, need) {
  const text = String(need || "").toLowerCase();
  if (!text) return false;
  const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

function fits(skill, need, taskType) {
  const route = routeForTask(taskType);
  if (route && route === skill) return true;
  return mentioned(skill, need);
}

function skillFromPlate(plate) {
  if (!plate || typeof plate !== "object") return "";
  const id = String(plate.id || "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return "";
  return id;
}

export function seekSkill({ skills, need, taskType, workKind, recall } = {}) {
  const confer = workKind === "feat" || workKind === "refactor";
  for (const skill of skillIdsFromRow(skills)) {
    if (fits(skill, need, taskType)) return { skill, tier: "card", confer };
  }
  let plate = null;
  if (typeof recall === "function") {
    try {
      plate = recall(String(need || ""));
    } catch {
      plate = null;
    }
  }
  const fromPlate = skillFromPlate(plate);
  if (fromPlate) return { skill: fromPlate, tier: "plate", confer };
  return { skill: null, tier: "decline", confer };
}
