#!/usr/bin/env node
/**
 * Turn confer on or off in the worn .xray/features.json.
 * A missing key stays off until this runs. Synthesis stays untouched.
 */
"use strict";

const fs = require("fs");
const path = require("path");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function orchestrationBlock(data) {
  const current = data.multi_agent_orchestration;
  if (current && typeof current === "object" && !Array.isArray(current)) return current;
  const created = {};
  data.multi_agent_orchestration = created;
  return created;
}

function conferBlock(orch) {
  const current = orch.confer;
  if (current && typeof current === "object" && !Array.isArray(current)) return current;
  const created = {};
  orch.confer = created;
  return created;
}

function main() {
  const state = process.argv[2];
  if (state !== "on" && state !== "off") fail("confer: say on or off");

  const featuresPath = path.join(process.cwd(), ".xray", "features.json");
  if (!fs.existsSync(featuresPath)) {
    fail("confer: .xray/features.json is missing. Run npx 0xray wear first.");
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(featuresPath, "utf8"));
  } catch {
    fail("confer: .xray/features.json is not valid JSON");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail("confer: .xray/features.json is not valid JSON");
  }

  const orch = orchestrationBlock(data);
  const confer = conferBlock(orch);
  if (state === "on") {
    confer.enabled = true;
    if (confer.on_synthesis !== false) confer.on_synthesis = true;
  } else {
    confer.enabled = false;
    confer.on_synthesis = false;
    orch.confer_on_synthesis = false;
  }

  fs.writeFileSync(featuresPath, `${JSON.stringify(data, null, 2)}\n`);
  process.stdout.write(`confer: ${state}\n`);
}

if (require.main === module) main();
