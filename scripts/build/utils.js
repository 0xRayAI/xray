#!/usr/bin/env node

/**
 * StringRay Framework Build Utilities
 * Consolidated build and deployment utilities
 * Author: StringRay Enforcer Agent
 * Version: 1.1.1
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BuildUtils {
  constructor() {
    this.projectDir = process.cwd();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '🔧',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️'
    }[type] || '🔧';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runBuild(options = {}) {
    this.log('Starting StringRay Framework Build...', 'info');
    
    const buildSteps = [
      { name: 'TypeScript Compilation', command: 'npm run typecheck' },
      { name: 'Bundle Creation', command: 'npm run build' },
      { name: 'Lint Validation', command: 'npm run lint' }
    ];

    for (const step of buildSteps) {
      try {
        this.log(`Running: ${step.name}`);
        await this.runCommand(step.command);
        this.log(`✅ ${step.name}: Completed`);
      } catch (error) {
        this.log(`❌ ${step.name}: Failed - ${error.message}`);
        if (!options.continueOnError) {
          throw error;
        }
      }
    }
    
    this.log('🎉 Build process completed successfully!', 'success');
  }

  runCommand(command, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        stdio: 'pipe',
        cwd: this.projectDir
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);
    });
  }

  cleanDist() {
    this.log('Cleaning dist directory...', 'info');
    
    try {
      if (fs.existsSync('dist')) {
        execSync('rm -rf dist', { stdio: 'inherit' });
        this.log('✅ Dist directory cleaned', 'success');
      } else {
        this.log('Dist directory does not exist', 'info');
      }
    } catch (error) {
      this.log(`❌ Failed to clean dist: ${error.message}`, 'error');
    }
  }

  verifyBuild() {
    this.log('Verifying build output...', 'info');
    
    const requiredFiles = [
      'dist/cli/index.js',
      'dist/plugin/strray-codex-injection.js',
      'dist/mcps/orchestrator.server.js'
    ];

    let allPresent = true;
    
    for (const file of requiredFiles) {
      if (fs.existsSync(path.join(this.projectDir, file))) {
        this.log(`✅ Found: ${file}`, 'success');
      } else {
        this.log(`❌ Missing: ${file}`, 'error');
        allPresent = false;
      }
    }
    
    this.log(`Build verification: ${allPresent ? '✅ PASSED' : '❌ FAILED'}`, allPresent ? 'success' : 'error');
    return allPresent;
  }
}

// CLI interface
const buildUtils = new BuildUtils();
const command = process.argv[2];

switch (command) {
  case 'build':
    buildUtils.runBuild()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Build failed:', error);
        process.exit(1);
      });
    break;
      
  case 'clean':
    buildUtils.cleanDist();
    break;
      
  case 'verify':
    buildUtils.verifyBuild()
      ? process.exit(0) : process.exit(1);
    break;
      
  default:
    console.log('Available commands:');
    console.log('  build   - Run full build process');
    console.log('  clean   - Clean dist directory');
    console.log('  verify  - Verify build output');
    console.log('');
    console.log('Usage: node build-utils.js <command>');
    process.exit(1);
}