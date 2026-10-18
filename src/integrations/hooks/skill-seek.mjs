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

const PLATE_SKILL = {
  boot: "boot-orchestrator",
  processor: "processor-pipeline",
  review: "code-review",
  suit: "suit-wear",
};

const PLATE_ONLY = new Set([
  "goggles",
  "kits",
  "host-pack",
  "glossary",
  "dichotomy",
  "syncopate",
  "digest",
  "triage",
  "loop",
]);

export function staleSkillRow(skills) {
  const raw = String(skills || "").trim();
  if (!raw || CATALOG_POINTERS.has(raw)) return true;
  if (raw.includes("/")) return true;
  return skillIdsFromRow(raw).length < 3;
}

function skillFromPlate(plate, known, cardSkills) {
  if (!plate || typeof plate !== "object") return "";
  const id = String(plate.id || "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return "";
  if (typeof cardSkills === "function") {
    const first = skillIdsFromRow(cardSkills(id))[0] || "";
    if (first && (!known || known.has(first))) return first;
  }
  const mapped = Object.prototype.hasOwnProperty.call(PLATE_SKILL, id) ? PLATE_SKILL[id] : "";
  if (mapped && (!known || known.has(mapped))) return mapped;
  if (PLATE_ONLY.has(id)) return "";
  if (known && !known.has(id)) return "";
  return id;
}

export function seekSkill({ skills, need, taskType, workKind, recall, known, cardSkills } = {}) {
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
  const fromPlate = skillFromPlate(plate, known, cardSkills);
  if (fromPlate) return { skill: fromPlate, tier: "plate", confer };
  return { skill: null, tier: "decline", confer };
}
