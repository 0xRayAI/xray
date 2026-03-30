#!/usr/bin/env node
/**
 * Remove all model references from configuration files
 */

import * as fs from 'fs';
import * as path from 'path';

const filesToProcess = [
  'opencode.json',
  'ci-test-env/opencode.json',
  '.opencode/strray/features.json',
  'ci-test-env/.opencode/strray/features.json',
];

function removeModelFromJson(content) {
  let data = JSON.parse(content);
  
  // Remove model from agent configs
  if (data.agent) {
    for (const [agent, config] of Object.entries(data.agent)) {
      if (config && typeof config === 'object') {
        delete config.model;
      }
    }
  }
  
  // Remove model_routing section
  if (data.model_routing) {
    data.model_routing = { enabled: false };
  }
  
  // Remove agent_models
  if (data.agent_management?.agent_models) {
    data.agent_management.agent_models = {};
  }
  
  return JSON.stringify(data, null, 2);
}

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  let cleaned = removeModelFromJson(content);
  
  fs.writeFileSync(filePath, cleaned);
  console.log(`✅ Processed: ${filePath}`);
}

console.log('🧹 Removing all model references from config files...\n');

filesToProcess.forEach(processFile);

console.log('\n✅ Done!');
