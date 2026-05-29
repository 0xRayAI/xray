#!/usr/bin/env node

/**
 * xray Framework Configuration Manager
 * Utilities for init, setup-dev, validate. Structured logs only to logs/framework/activity.log.
 * Identity: xray (plain)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureLogDir(projectDir) {
  const logDir = path.join(projectDir, 'logs', 'framework');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

function structuredLog(projectDir, message, level = 'info') {
  try {
    const logDir = ensureLogDir(projectDir);
    const timestamp = new Date().toISOString();
    const entry = `${timestamp} [config-utils] [${level}] ${message}\n`;
    fs.appendFileSync(path.join(logDir, 'activity.log'), entry, 'utf-8');
  } catch {
    // Never crash on logging
  }
}

class ConfigManager {
  constructor() {
    this.projectDir = process.cwd();
  }

  log(message, type = 'info') {
    const prefix = { 'info': '⚙️', 'success': '✅', 'error': '❌', 'warning': '⚠️', 'config': '🔧' }[type] || '⚙️';
    structuredLog(this.projectDir, `${prefix} ${message}`, type);
  }

  createDefaultConfig() {
    this.log('Creating default xray configuration...', 'config');
    
    const defaultConfig = {
      framework: {
        name: 'xray Framework',
        version: '2.0.0',
        buildMode: 'production',
        logLevel: 'info'
      },
      agents: {
        orchestrator: { enabled: true, maxComplexity: 100, timeout: 30000 },
        enforcer: { enabled: true, strictMode: true, todoSystem: 'file-based' },
        testing: { parallelExecution: true, timeout: 120000, coverageThreshold: 85 }
      },
      monitoring: { enabled: true, logRetention: '7d', healthChecks: true }
    };
    
    const configPath = path.join(this.projectDir, '.xrayrc.json');
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    this.log(`Configuration saved to: ${configPath}`, 'success');
    return configPath;
  }

  validateConfig() {
    const configPath = path.join(this.projectDir, '.xrayrc.json');
    
    if (!fs.existsSync(configPath)) {
      this.log('Configuration file not found, creating default...', 'warning');
      return this.createDefaultConfig();
    }
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      this.log('Configuration loaded successfully', 'success');
      return config;
    } catch (error) {
      this.log(`Failed to load configuration: ${error.message}`, 'error');
      return null;
    }
  }

  async setupDevelopment() {
    this.log('Setting up xray development environment...', 'config');
    
    const setupSteps = [
      { name: 'Install Dependencies', command: 'npm install' },
      { name: 'Build Framework', command: 'npm run build' },
      { name: 'Setup Hooks', command: 'node scripts/node/postinstall.cjs' },
      { name: 'Validate Setup', command: 'npm run validate' }
    ];

    for (const step of setupSteps) {
      try {
        this.log(`Running: ${step.name}`);
        await this.runCommand(step.command);
        this.log(`${step.name}: Completed`, 'success');
      } catch (error) {
        this.log(`${step.name}: Failed - ${error.message}`, 'error');
        return false;
      }
    }
    
    this.log('Development setup completed successfully!', 'success');
    return true;
  }

  runCommand(command, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        stdio: 'pipe',
        cwd: this.projectDir
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
}

// CLI interface
const configManager = new ConfigManager();
const command = process.argv[2];

switch (command) {
  case 'init':
    configManager.createDefaultConfig();
    break;
    
  case 'setup-dev':
    configManager.setupDevelopment();
    break;
    
  case 'validate':
    const config = configManager.validateConfig();
    if (config) {
      structuredLog(configManager.projectDir, 'Configuration is valid', 'success');
      process.exit(0);
    } else {
      structuredLog(configManager.projectDir, 'Configuration is invalid', 'error');
      process.exit(1);
    }
    break;
    
  default:
    structuredLog(configManager.projectDir, 'xray Configuration Manager | Commands: init | setup-dev | validate', 'info');
    process.exit(1);
}
