#!/usr/bin/env node

/**
 * Comprehensive Script Fixer for StringRay Framework
 * 
 * Fixes common path resolution, module import, and build issues
 * across all framework scripts in one execution.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ScriptFixer {
  constructor() {
    this.fixed = [];
    this.errors = [];
  }

  async fixAllScripts() {
    console.log('🔧 COMPREHENSIVE SCRIPT FIXER');
    console.log('====================================');

    // 1. Fix TypeScript compilation issues
    this.fixTypeScriptCompilation();
    
    // 2. Fix CommonJS/ES Module resolution
    this.fixModuleResolution();
    
    // 3. Fix import path issues
    this.fixImportPaths();
    
    // 4. Rebuild affected components
    this.rebuildAffectedFiles();
    
    // 5. Test fixes
    this.testFixedFiles();
    
    // 6. Report results
    this.reportResults();
  }

  fixTypeScriptCompilation() {
    console.log('\n📝 1. Fixing TypeScript Compilation Issues...');
    
    // Run TypeScript build to identify compilation errors
    try {
      const buildOutput = execSync('npm run build', { encoding: 'utf8', stdio: 'pipe' });
      
      if (buildOutput.includes('error TS') || buildOutput.includes('error TS2307')) {
        console.error('❌ TypeScript compilation errors detected');
        this.errors.push('TypeScript compilation failed');
        return;
      }
      
      console.log('✅ TypeScript compilation successful');
      this.fixed.push('TypeScript compilation fixed');
    } catch (error) {
      console.error(`❌ Build error: ${error.message}`);
      this.errors.push('Build process failed');
    }
  }

  fixModuleResolution() {
    console.log('\n📦 2. Fixing CommonJS/ES Module Resolution...');
    
    // Fix package.json if needed
    if (this.needsModuleResolutionFix()) {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (packageJson.type === 'module') {
          packageJson.type = 'commonjs';
          fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
          console.log('✅ Fixed package.json type for CommonJS compatibility');
          this.fixed.push('Package.json module type fixed');
        }
      } catch (error) {
        console.log(`❌ Package.json fix failed: ${error.message}`);
        this.errors.push('Package.json fix failed');
      }
    }
  }

  needsModuleResolutionFix() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.type === 'module';
    } catch {
      return true; // Assume fix needed
    }
  }

  fixImportPaths() {
    console.log('\n📥 3. Fixing Import Path Issues...');
    
    // Fix framework-logger imports
    const fixLoggerPaths = () => {
      const files = [
        'src/postprocessor/validation/ComprehensiveValidator.ts',
        'src/postprocessor/validation/HookMetricsCollector.ts',
        'src/__tests__/unit/codebase-context-analyzer.test.ts',
        'src/__tests__/unit/rule-enforcer.test.ts',
        'src/__tests__/unit/dependency-graph-builder.test.ts',
        'src/__tests__/unit/session-state-manager.test.ts',
        'src/__tests__/integration/commit-batching-enforcement-integration.test.ts',
        'src/__tests__/integration/context-providers-integration.test.ts',
        'src/__tests__/orchestrator/agent-spawn-governor.test.ts'
      ];
      
      for (const file of files) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          const fixed = content.replace(/..\/\.\.\/framework-logger/g, '../../core/framework-logger/g');
          
          if (content !== fixed) {
            fs.writeFileSync(file, fixed);
            console.log(`✅ Fixed logger imports in ${file}`);
            this.fixed.push(`Fixed logger imports: ${file}`);
          }
        }
      }
    };

    // Fix MCP server paths
    fixLoggerPaths();
    
    // Fix model-router imports
    try {
      const modelRouterFile = 'src/mcps/model-health-check.server.ts';
      if (fs.existsSync(modelRouterFile)) {
        const content = fs.readFileSync(modelRouterFile, 'utf8');
        const fixed = content.replace(
          /import { modelRouter } from "\.\.\/\.\.\/core\/model-router";/g,
          'import VALID_MODELS from "\.\.\/\.\.\/core\/model-router";/g'
        );
        
        if (content !== fixed) {
          fs.writeFileSync(modelRouterFile, fixed);
          console.log(`✅ Fixed model-router import in ${modelRouterFile}`);
          this.fixed.push(`Fixed model-router import: ${modelRouterFile}`);
        }
      }
    } catch (error) {
      console.log(`❌ Model-router fix failed: ${error.message}`);
      this.errors.push(`Model-router fix failed: ${error.message}`);
    }
  }

  rebuildAffectedFiles() {
    console.log('\n🔨 4. Rebuilding Affected Files...');
    
    // Rebuild TypeScript files
    const rebuildSuccess = this.runCommand('npm run build', 'TypeScript rebuild');
    
    if (rebuildSuccess) {
      console.log('✅ TypeScript rebuild successful');
      this.fixed.push('TypeScript rebuild successful');
    } else {
      console.log('❌ TypeScript rebuild failed');
      this.errors.push('TypeScript rebuild failed');
    }
  }

  testFixedFiles() {
    console.log('\n🧪 5. Testing Fixed Files...');
    
    // Test a few key scripts
    const testScripts = [
      { name: 'Configuration Validation', command: 'timeout 10s node scripts/mjs/test-configuration-validation.mjs' },
      { name: 'MCP Connectivity', command: 'timeout 10s node scripts/node/validate-mcp-connectivity.js' },
      { name: 'Self-Direction Activation', command: 'timeout 10s node scripts/node/activate-self-direction.js' }
    ];
    
    for (const test of testScripts) {
      console.log(`Testing ${test.name}...`);
      const success = this.runCommand(test.command);
      
      if (success) {
        console.log(`✅ ${test.name} working`);
        this.fixed.push(`${test.name} working`);
      } else {
        console.log(`❌ ${test.name} failed`);
        this.errors.push(`${test.name} failed`);
      }
    }
  }

  runCommand(command) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8', 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000
      });
      return !result.includes('❌') && !result.includes('Error') && result.exitCode === 0;
    } catch (error) {
      console.error(`Command failed: ${command} - ${error.message}`);
      return false;
    }
  }

  reportResults() {
    console.log('\n📊 COMPREHENSIVE FIX RESULTS');
    console.log('====================================');
    console.log(`✅ Successfully Fixed: ${this.fixed.length} issues`);
    console.log(`❌ Failed to Fix: ${this.errors.length} issues`);
    
    if (this.errors.length === 0) {
      console.log('🎉 ALL SCRIPTS FIXED SUCCESSFULLY!');
    } else {
      console.log('⚠️ SOME ISSUES REMAINING:');
      this.errors.forEach(error => console.log(`  • ${error}`));
    }
  }

  async main() {
    await this.fixAllScripts();
  }
}

// Run if executed directly
if (require.main === module) {
  const fixer = new ScriptFixer();
  fixer.main()
    .then(() => {
      process.exit(fixer.errors.length === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Script fixer failed:', error);
      process.exit(1);
    });
}