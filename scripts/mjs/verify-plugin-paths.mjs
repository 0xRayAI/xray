#!/usr/bin/env node

/**
 * Verify Plugin Paths
 * 
 * Validates that plugin paths in configuration files were correctly
 * transformed from development paths to node_modules paths after npm install.
 * 
 * This catches the common bug where postinstall script fails to transform
 * paths like "strray/dist/plugin/..." to "node_modules/strray-ai/dist/plugin/..."
 */

import fs from 'fs';
import path from 'path';

class PathVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = [];
  }

  log(message) {
    console.log(message);
  }

  error(message) {
    this.errors.push(message);
    console.error(`❌ ${message}`);
  }

  warning(message) {
    this.warnings.push(message);
    console.warn(`⚠️  ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  check(description) {
    this.checks.push(description);
    console.log(`🔍 ${description}`);
  }

  async verify() {
    console.log('\n🔍 PLUGIN PATH VERIFICATION');
    console.log('============================\n');

    const cwd = process.cwd();
    console.log(`Working directory: ${cwd}\n`);

    // Check 1: Verify OpenCode.json exists and has correct paths
    await this.verifyOhMyOpencodeConfig();

    // Check 2: Verify opencode.json has correct paths
    await this.verifyOpencodeConfig();

    // Check 3: Verify plugin files actually exist at expected locations
    await this.verifyPluginFilesExist();

    // Check 4: Verify old paths are not present (would indicate failed transformation)
    await this.verifyNoOldPaths();

    // Summary
    this.printSummary();

    // Exit with appropriate code
    if (this.errors.length > 0) {
      console.error(`\n❌ VERIFICATION FAILED: ${this.errors.length} error(s)`);
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log(`\n⚠️  VERIFICATION PASSED WITH WARNINGS: ${this.warnings.length} warning(s)`);
      process.exit(0);
    } else {
      console.log('\n✅ ALL PATHS CORRECTLY TRANSFORMED');
      process.exit(0);
    }
  }

  async verifyOhMyOpencodeConfig() {
    this.check('OpenCode.json paths');

    const configPath = '.opencode/OpenCode.json';
    if (!fs.existsSync(configPath)) {
      this.error(`${configPath} not found`);
      return;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);

      // Check plugin paths
      if (config.plugin && Array.isArray(config.plugin)) {
        let hasNodeModulesPath = false;
        let hasOldPath = false;

        for (const pluginPath of config.plugin) {
          if (pluginPath.includes('node_modules/strray-ai/')) {
            hasNodeModulesPath = true;
            this.success(`Plugin path transformed: ${pluginPath}`);
          } else if (pluginPath.includes('strray/') || pluginPath.includes('src/')) {
            hasOldPath = true;
            this.error(`Plugin path NOT transformed: ${pluginPath}`);
          }
        }

        if (!hasNodeModulesPath && config.plugin.length > 0) {
          this.error('No plugin paths point to node_modules/strray-ai/');
        }
      }

      // Check MCP server paths
      if (config.mcpServers) {
        for (const [name, server] of Object.entries(config.mcpServers)) {
          if (server.args && Array.isArray(server.args)) {
            const serverPath = server.args[server.args.length - 1];
            if (serverPath) {
              if (serverPath.includes('node_modules/strray-ai/')) {
                this.success(`MCP server "${name}" path transformed`);
              } else if (serverPath.includes('strray/') || serverPath.includes('dist/plugin/mcps/')) {
                this.error(`MCP server "${name}" path NOT transformed: ${serverPath}`);
              }
            }
          }
        }
      }

    } catch (error) {
      this.error(`Failed to parse ${configPath}: ${error.message}`);
    }
  }

  async verifyOpencodeConfig() {
    this.check('opencode.json paths');

    const configPath = 'opencode.json';
    if (!fs.existsSync(configPath)) {
      this.error(`${configPath} not found`);
      return;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);

      // Check mcpServers paths
      if (config.mcpServers) {
        for (const [name, server] of Object.entries(config.mcpServers)) {
          if (server.command && Array.isArray(server.command)) {
            const serverPath = server.command[server.command.length - 1];
            if (serverPath) {
              if (serverPath.includes('node_modules/strray-ai/')) {
                this.success(`OpenCode MCP server "${name}" path transformed`);
              } else if (serverPath.includes('strray/') || serverPath.startsWith('./dist/')) {
                this.error(`OpenCode MCP server "${name}" path NOT transformed: ${serverPath}`);
              }
            }
          }
        }
      }

    } catch (error) {
      this.error(`Failed to parse ${configPath}: ${error.message}`);
    }
  }

  async verifyPluginFilesExist() {
    this.check('Plugin files exist at expected locations');

    const expectedFiles = [
      'node_modules/strray-ai/dist/plugin/strray-codex-injection.js',
      'node_modules/strray-ai/dist/plugin/strray-codex-injection.d.ts',
    ];

    for (const file of expectedFiles) {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        this.success(`${file} exists (${(stats.size / 1024).toFixed(1)} KB)`);
      } else {
        this.error(`${file} NOT FOUND`);
      }
    }
  }

  async verifyNoOldPaths() {
    this.check('No old development paths remaining');

    const filesToCheck = [
      '.opencode/OpenCode.json',
      'opencode.json',
    ];

    const oldPathPatterns = [
      '"strray/dist/',
      '"src/plugin/',
      '"./dist/plugin/mcps/',
    ];

    for (const file of filesToCheck) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf8');

      for (const pattern of oldPathPatterns) {
        if (content.includes(pattern)) {
          this.error(`${file} contains old path pattern: ${pattern}`);
        }
      }
    }
  }

  printSummary() {
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('=======================\n');
    console.log(`Total checks: ${this.checks.length}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
    }
  }
}

// Run verification
const verifier = new PathVerifier();
verifier.verify().catch(error => {
  console.error('Verification failed with error:', error);
  process.exit(1);
});
