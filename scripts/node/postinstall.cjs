#!/usr/bin/env node

/**
 * StrRay Plugin Post-Installation Setup
 * Copies configuration files to project root and updates paths
 */

const fs = require("fs");
const path = require("path");

console.log('🔧 StrRay Postinstall: Script starting...');

// Find the package root relative to this script
const packageRoot = path.join(__dirname, "..", "..");

// Get the consumer directory - npm changes to node_modules/<package> during postinstall
// We need to find the parent of node_modules/<package>
// The script is at: <consumer>/node_modules/strray-ai/scripts/node/postinstall.cjs
// So we need to go up: scripts/node -> strray-ai -> node_modules -> <consumer>
let targetDir;

// Check if we're in node_modules (normal npm install)
if (__dirname.includes("node_modules/strray-ai")) {
  // Go up from scripts/node to node_modules/strray-ai to consumer root
  targetDir = path.join(__dirname, "..", "..", "..", "..");
} else {
  // Fallback: use PWD or cwd
  targetDir = process.env.PWD || process.cwd();
}

console.log("🔧 StrRay Postinstall: Script directory:", __dirname);
console.log("🔧 StrRay Postinstall: Package root:", packageRoot);
console.log("🔧 StrRay Postinstall: Consumer directory:", targetDir);
console.log("🔧 StrRay Postinstall: Current working dir:", process.cwd());

// Configuration files to copy during installation (OpenCode consumers only)
const configFiles = [
  // opencode.json NOT included — Hermes consumers don't need it
  "AGENTS-consumer.md:AGENTS.md"  // Minimal version for consumers
];

// Files that should be MERGED (not overwritten) - user customizations
const MERGE_FILES = [
  'strray/features.json',
  'enforcer-config.json',
  'opencode.json'  // Smart merge to add new agents while preserving user overrides
];

// Special handling for root-level opencode.json
const ROOT_OPENCODE_JSON = path.join(packageRoot, 'opencode.json');

// Detect if Hermes Agent is present (Rust binary in consumer's home directory)
// Hermes consumers don't need .opencode/ - they use .strray/ natively
// Check consumer's HOME - if Hermes exists, skip .opencode/ setup
const consumerHomeDir = process.env.HOME || process.env.USERPROFILE;
const hasHermes = consumerHomeDir && fs.existsSync(path.join(consumerHomeDir, '.hermes')) && 
                  fs.lstatSync(path.join(consumerHomeDir, '.hermes')).isDirectory();

if (hasHermes) {
  console.log('🔍 Hermes Agent present — using .strray/ (skipping .opencode/ setup)');
}

// Directories to skip entirely
const SKIP_DIRS = [
  'node_modules',
  'logs',
  'openclaw'
];

// Files to skip
const SKIP_FILES = [
  '.strrayrc.json',
  'package.json',
  'package-lock.json'
];

// Copy core skills from src/skills/ to .opencode/skills/ (OpenCode consumers only)
if (!hasHermes) {
const skillsSource = path.join(packageRoot, 'src', 'skills');
const skillsDest = path.join(targetDir, '.opencode', 'skills');

if (fs.existsSync(skillsSource)) {
  try {
    if (!fs.existsSync(skillsDest)) {
      fs.mkdirSync(skillsDest, { recursive: true });
    }
    const skillDirs = fs.readdirSync(skillsSource, { withFileTypes: true });
    let copied = 0;
    let skipped = 0;
    for (const entry of skillDirs) {
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(skillsSource, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      const destMd = path.join(skillsDest, entry.name, 'SKILL.md');
      const destDir = path.dirname(destMd);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      if (fs.existsSync(destMd)) {
        const destContent = fs.readFileSync(destMd, 'utf8');
        if (destContent.includes('source: community')) {
          skipped++;
          continue;
        }
        const shouldCopy = fs.statSync(skillMd).mtime > fs.statSync(destMd).mtime;
        if (!shouldCopy) continue;
      }

      fs.copyFileSync(skillMd, destMd);
      copied++;
    }
    if (copied > 0) {
      console.log(`✅ Copied ${copied} core skills → .opencode/skills/`);
    }
    if (skipped > 0) {
      console.log(`⏭️  Skipped ${skipped} community skills (not overwritten by framework)`);
    } else {
      console.log(`ℹ️ Core skills unchanged, skipping copy`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not copy skills:`, error.message);
  }
} // end existsSync(skillsSource)
} // end hasHermes guard for skills

// Copy .opencode directory recursively with smart merging (OpenCode consumers only)
if (!hasHermes) {
const opencodeSource = path.join(packageRoot, '.opencode');
const opencodeDest = path.join(targetDir, '.opencode');

if (fs.existsSync(opencodeSource)) {
  try {
    function copyDirSmart(src, dest, baseRelPath = '') {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        const relPath = path.join(baseRelPath, entry.name);
        
        // Skip certain directories
        if (entry.isDirectory() && SKIP_DIRS.includes(entry.name)) {
          console.log(`⏭️ Skipping directory: ${relPath}`);
          continue;
        }
        
        // Skip certain files
        if (!entry.isDirectory() && SKIP_FILES.includes(entry.name)) {
          console.log(`⏭️ Skipping file: ${relPath}`);
          continue;
        }
        
        if (entry.isDirectory()) {
          copyDirSmart(srcPath, destPath, relPath);
        } else if (MERGE_FILES.includes(relPath)) {
          // Merge JSON files instead of overwriting
          mergeJsonFile(srcPath, destPath, relPath);
        } else {
          // Regular copy
          fs.copyFileSync(srcPath, destPath);
          console.log(`✅ Copied: ${relPath}`);
        }
      }
    }
    
    // Merge JSON files: preserve user settings, add new defaults
    function mergeJsonFile(srcPath, destPath, relPath) {
      try {
        const srcContent = fs.readFileSync(srcPath, 'utf8');
        const srcData = JSON.parse(srcContent);
        
        if (fs.existsSync(destPath)) {
          // File exists - merge it
          const destContent = fs.readFileSync(destPath, 'utf8');
          const destData = JSON.parse(destContent);
          
          // Deep merge: preserve user values, add new defaults
          const merged = deepMerge(srcData, destData);
          fs.writeFileSync(destPath, JSON.stringify(merged, null, 2), 'utf8');
          console.log(`🔄 Merged: ${relPath} (preserved user settings)`);
        } else {
          // File doesn't exist - copy it
          fs.copyFileSync(srcPath, destPath);
          console.log(`✅ Copied: ${relPath}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not merge ${relPath}:`, error.message);
        // Fallback: try to copy anyway
        try {
          fs.copyFileSync(srcPath, destPath);
          console.log(`✅ Copied (fallback): ${relPath}`);
        } catch (copyError) {
          console.warn(`⚠️ Could not copy ${relPath}:`, copyError.message);
        }
      }
    }
    
    // Deep merge helper: src = new defaults, dest = user settings (dest wins)
    function deepMerge(src, dest) {
      if (typeof src !== 'object' || src === null) return dest !== undefined ? dest : src;
      if (Array.isArray(src)) {
        // For arrays, use destination if it exists, otherwise use source
        return Array.isArray(dest) ? dest : src;
      }
      
      const result = {};
      // Start with all source keys
      for (const key of Object.keys(src)) {
        if (dest && typeof dest[key] !== 'undefined') {
          // Key exists in both - merge recursively
          result[key] = deepMerge(src[key], dest[key]);
        } else {
          // Key only in source - use source value
          result[key] = src[key];
        }
      }
      // Add any keys that only exist in destination
      if (dest && typeof dest === 'object') {
        for (const key of Object.keys(dest)) {
          if (!(key in src)) {
            result[key] = dest[key];
          }
        }
      }
      return result;
    }
    
    copyDirSmart(opencodeSource, opencodeDest);
    console.log(`✅ Copied/merged .opencode directory`);
  } catch (error) {
    console.warn(`⚠️ Could not copy directory .opencode:`, error.message);
  }
} // end existsSync(opencodeSource)
} // end hasHermes guard for .opencode dir

// Handle root-level opencode.json with smart merge (OpenCode consumers only)
if (!hasHermes) {
  const userOpencodeJson = path.join(targetDir, 'opencode.json');
  
  if (fs.existsSync(ROOT_OPENCODE_JSON)) {
    try {
      if (fs.existsSync(userOpencodeJson)) {
        // Both exist - smart merge (preserve user agents, add new ones)
        mergeJsonFile(ROOT_OPENCODE_JSON, userOpencodeJson, 'opencode.json');
      } else {
        // Only package has it - copy it
        fs.copyFileSync(ROOT_OPENCODE_JSON, userOpencodeJson);
        console.log(`✅ Installed opencode.json (no user config exists)`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not handle opencode.json:`, error.message);
    }
  }
}

// Copy plugin from dist/plugin/ to .opencode/plugin/ (OpenCode consumers only)
if (!hasHermes) {
const pluginSource = path.join(packageRoot, 'dist', 'plugin', 'strray-codex-injection.js');
const pluginDest = path.join(targetDir, '.opencode', 'plugin', 'strray-codex-injection.js');

if (fs.existsSync(pluginSource)) {
  try {
    const destDir = path.dirname(pluginDest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    // Always copy if source is newer or dest doesn't exist
    const shouldCopy = !fs.existsSync(pluginDest) ||
      fs.statSync(pluginSource).mtime > fs.statSync(pluginDest).mtime;
    if (shouldCopy) {
      fs.copyFileSync(pluginSource, pluginDest);
      console.log(`✅ Copied plugin: dist/plugin/strray-codex-injection.js → .opencode/plugin/`);
    } else {
      console.log(`ℹ️ Plugin file unchanged, skipping copy`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not copy plugin:`, error.message);
  }
} else {
  console.warn(`⚠️ Plugin source not found: ${pluginSource}`);
}
} // end hasHermes guard for plugin

// Copy individual files (OpenCode consumers only — Hermes uses .strray/ directly)
if (!hasHermes) {
console.log("🔧 StrRay Postinstall: Copying configuration files...");
console.log("📍 Package root:", packageRoot);
console.log("📍 Target directory:", targetDir);

configFiles.forEach(fileMapping => {
  // Handle "source:destination" format for renames
  const [sourceFile, destFile] = fileMapping.split(':');
  const source = path.join(packageRoot, sourceFile);
  const dest = path.join(targetDir, destFile || sourceFile);

  try {
    if (fs.existsSync(source)) {
      // Ensure destination directory exists
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`📁 Created directory: ${destDir}`);
      }

      fs.copyFileSync(source, dest);
      console.log(`✅ Copied ${sourceFile} → ${destFile || sourceFile}`);
    } else {
      console.warn(`⚠️ Source not found: ${source}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not copy ${fileMapping}:`, error.message);
  }
});
} // end hasHermes guard for config files

// Create symlink to scripts directory for post-processor monitoring
const scriptsSource = path.join(packageRoot, 'scripts');
const scriptsDest = path.join(targetDir, 'scripts');

if (fs.existsSync(scriptsSource)) {
  try {
    if (fs.existsSync(scriptsDest)) {
      const stats = fs.lstatSync(scriptsDest);
      if (stats.isSymbolicLink()) {
        console.log(`✅ scripts symlink already exists`);
      } else {
        console.log(`⚠️ scripts exists but is not a symlink`);
      }
    } else {
      fs.symlinkSync(scriptsSource, scriptsDest, 'dir');
      console.log(`✅ Created scripts symlink → node_modules/strray-ai/scripts`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not create scripts symlink:`, error.message);
  }
}

// Detect if we're in a consumer environment (installed via npm)
// Check for strray-ai package manifest instead of string-matching directory paths
const cwd = process.cwd();
const isConsumerEnvironment = fs.existsSync(
  path.join(targetDir, 'node_modules', 'strray-ai', 'package.json')
) || fs.existsSync(
  path.join(cwd, 'node_modules', 'strray-ai', 'package.json')
);

// Convert paths for consumer environment (OpenCode consumers only)
if (!hasHermes && isConsumerEnvironment) {
  console.log("🔧 StrRay Postinstall: Converting paths for consumer environment...");

  // Note: .mcp.json was refactored out - no longer need to update MCP paths
  // Note: "plugin" config is for npm packages only - local plugins go in .opencode/plugin/
  // See OpenCode docs: https://opencode.ai/docs/config/#plugins
  // So we don't need to update plugin paths in opencode.json anymore

// Convert MCP server paths only (not plugin paths - those are for npm packages)
// Note: MCP servers are in dist/mcps/ NOT dist/plugin/mcps/
  const mainOpencodePath = path.join(targetDir, "opencode.json");
  if (fs.existsSync(mainOpencodePath)) {
    try {
      const opencode = JSON.parse(fs.readFileSync(mainOpencodePath, "utf8"));
      let modified = false;
      // Convert MCP server paths in command arrays
      if (opencode.mcpServers) {
        for (const server of Object.values(opencode.mcpServers)) {
          if (server.command && typeof server.command === 'string') {
            const updated = server.command.replace(
              /node_modules\/strray-ai\/dist\/mcps\//,
              'node_modules/strray-ai/dist/mcps/'
            );
            // Normalize any relative dist paths to use node_modules
            const normalized = updated.replace(
              /^[.]{0,2}\/dist\/mcps\//,
              'node_modules/strray-ai/dist/mcps/'
            );
            if (normalized !== server.command) {
              server.command = normalized;
              modified = true;
            }
          }
          // Handle command arrays (some MCP configs use arrays)
          if (Array.isArray(server.command)) {
            server.command = server.command.map(arg =>
              arg.replace(/^[.]{0,2}\/dist\/mcps\//, 'node_modules/strray-ai/dist/mcps/')
            );
            modified = true;
          }
        }
      }
      if (modified) {
        fs.writeFileSync(mainOpencodePath, JSON.stringify(opencode, null, 2) + "\n", "utf8");
        console.log("✅ Updated MCP paths in opencode.json");
      } else {
        console.log("ℹ️  No MCP path updates needed in opencode.json");
      }
    } catch (error) {
      console.warn(`⚠️ Could not update opencode.json: ${error.message}`);
    }
  }
}

console.log("🔧 StrRay Postinstall: Consumer installation complete - all paths are correctly configured.");

// Copy .strray directory for persistent config (never symlink — user may modify local config)
const strraySource = path.join(packageRoot, '.strray');
const strrayDest = path.join(targetDir, '.strray');

if (fs.existsSync(strraySource)) {
  try {
    const resolvedSource = path.resolve(strraySource);
    const resolvedDest = path.resolve(strrayDest);

    // Skip if source === dest (running postinstall in the dev repo itself)
    if (resolvedSource === resolvedDest) {
      console.log(`ℹ️ Skipping .strray copy — source and destination are the same`);
    } else if (fs.existsSync(strrayDest)) {
      // .strray already exists — don't overwrite, the user may have local config
      console.log(`ℹ️ .strray directory already exists — keeping existing (user config preserved)`);
    } else {
      // Copy the directory recursively
      function copyDir(src, dest) {
        fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }
      copyDir(strraySource, strrayDest);
      console.log(`✅ .strray directory copied`);
    }
  } catch (error) {
    console.error(`❌ Failed to copy .strray:`, error.message);
  }
}

console.log("🎉 StrRay Postinstall: Configuration complete!");

// Create symlink to dist for MCP servers that look for "dist/" path
const distSource = path.join(packageRoot, 'dist');
const distDest = path.join(targetDir, 'dist');

if (fs.existsSync(distSource)) {
  try {
    if (fs.existsSync(distDest)) {
      const stats = fs.lstatSync(distDest);
      if (stats.isSymbolicLink()) {
        console.log(`✅ dist symlink already exists`);
      } else {
        console.log(`⚠️ dist exists but is not a symlink - MCP servers may not work correctly`);
      }
    } else {
      fs.symlinkSync(distSource, distDest, 'dir');
      console.log(`✅ Created dist symlink → node_modules/strray-ai/dist`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not create dist symlink:`, error.message);
  }
}

// Install hermes-agent skill to ~/.hermes/skills/ if Hermes is present
const hermesSkillSource = path.join(packageRoot, 'src', 'skills', 'hermes-agent', 'SKILL.md');

if (fs.existsSync(hermesSkillSource)) {
  try {
    const targetHermesSkills = path.join(homeDir, '.hermes', 'skills', 'hermes-agent');

    if (fs.existsSync(path.join(homeDir, '.hermes'))) {
      if (!fs.existsSync(targetHermesSkills)) {
        fs.mkdirSync(targetHermesSkills, { recursive: true });
      }
      const destSkill = path.join(targetHermesSkills, 'SKILL.md');
      const shouldCopySkill = !fs.existsSync(destSkill) ||
        fs.statSync(hermesSkillSource).mtime > fs.statSync(destSkill).mtime;
      if (shouldCopySkill) {
        fs.copyFileSync(hermesSkillSource, destSkill);
        console.log("✅ Installed hermes-agent skill → ~/.hermes/skills/hermes-agent/");
      } else {
        console.log("ℹ️ hermes-agent skill already up to date");
      }
    }
  } catch (error) {
    console.warn("⚠️ Could not install Hermes skill:", error.message);
  }
}

// Install hermes-agent PLUGIN to ~/.hermes/plugins/strray-hermes/ if Hermes is present
const hermesPluginSource = path.join(packageRoot, 'src', 'integrations', 'hermes-agent');

if (fs.existsSync(hermesPluginSource)) {
  try {
    const hermesDir = path.join(homeDir, '.hermes');

    if (fs.existsSync(hermesDir)) {
      const targetPluginDir = path.join(hermesDir, 'plugins', 'strray-hermes');
      const pluginFiles = ['__init__.py', 'tools.py', 'schemas.py', 'plugin.yaml',
                           'bridge.mjs', 'conftest.py', 'after-install.md',
                           'test_plugin.py'];

      // Check if any file needs updating
      let needsUpdate = false;
      if (!fs.existsSync(targetPluginDir)) {
        needsUpdate = true;
      } else {
        for (const file of pluginFiles) {
          const src = path.join(hermesPluginSource, file);
          const dst = path.join(targetPluginDir, file);
          if (fs.existsSync(src) && (!fs.existsSync(dst) ||
              fs.statSync(src).mtime > fs.statSync(dst).mtime)) {
            needsUpdate = true;
            break;
          }
        }
      }

      if (needsUpdate) {
        if (!fs.existsSync(targetPluginDir)) {
          fs.mkdirSync(targetPluginDir, { recursive: true });
        }
        let copied = 0;
        for (const file of pluginFiles) {
          const src = path.join(hermesPluginSource, file);
          const dst = path.join(targetPluginDir, file);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dst);
            copied++;
          }
        }
        console.log(`✅ Installed strray-hermes plugin → ~/.hermes/plugins/strray-hermes/ (${copied} files)`);
      } else {
        console.log("ℹ️ strray-hermes plugin already up to date");
      }
    }
  } catch (error) {
    console.warn("⚠️ Could not install Hermes plugin:", error.message);
  }
}

// Install git hooks (pre-commit, post-commit, pre-push, post-push)
const hookNames = ['pre-commit', 'post-commit', 'pre-push', 'post-push'];
const hooksSourceDir = path.join(packageRoot, 'hooks');
const scriptsHooksDir = path.join(packageRoot, 'scripts', 'hooks');

function installGitHooks() {
  // Determine git hooks directory
  const gitDir = path.join(targetDir, '.git');
  if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
    console.log('ℹ️  No .git directory found, skipping git hooks installation');
    return;
  }

  const gitHooksDir = path.join(gitDir, 'hooks');
  if (!fs.existsSync(gitHooksDir)) {
    fs.mkdirSync(gitHooksDir, { recursive: true });
  }

  // Check if the hook runner exists
  const hookRunner = path.join(scriptsHooksDir, 'run-hook.js');
  const hookRunnerDist = path.join(packageRoot, 'dist', 'scripts', 'hooks', 'run-hook.js');
  const hasHookRunner = fs.existsSync(hookRunner) || fs.existsSync(hookRunnerDist);

  if (!hasHookRunner) {
    console.warn('⚠️ Hook runner not found (scripts/hooks/run-hook.js), skipping git hooks');
    return;
  }

  let installed = 0;
  let skipped = 0;

  for (const hookName of hookNames) {
    const hookSource = path.join(hooksSourceDir, hookName);
    const hookDest = path.join(gitHooksDir, hookName);

    if (!fs.existsSync(hookSource)) {
      console.warn(`⚠️ Hook script not found: ${hookName}`);
      continue;
    }

    if (fs.existsSync(hookDest)) {
      // Check if it's already a StringRay hook or a symlink to one
      try {
        const destContent = fs.readFileSync(hookDest, 'utf8');
        if (destContent.includes('StringRay') || destContent.includes('strray')) {
          // Already a StringRay hook — update if source is newer
          if (fs.statSync(hookSource).mtime > fs.statSync(hookDest).mtime) {
            fs.copyFileSync(hookSource, hookDest);
            fs.chmodSync(hookDest, 0o755);
            installed++;
          } else {
            skipped++;
          }
          continue;
        }
      } catch (e) {
        // Can't read — overwrite
      }

      // Non-StringRay hook exists — back it up
      const backupDest = hookDest + '.strray-backup';
      if (!fs.existsSync(backupDest)) {
        fs.copyFileSync(hookDest, backupDest);
        console.log(`📝 Backed up existing ${hookName} → ${hookName}.strray-backup`);
      }
    }

    fs.copyFileSync(hookSource, hookDest);
    fs.chmodSync(hookDest, 0o755);
    installed++;
  }

  if (installed > 0) {
    console.log(`✅ Installed ${installed} git hook(s) (${hookNames.join(', ')})`);
  }
  if (skipped > 0) {
    console.log(`ℹ️  ${skipped} git hook(s) already up to date`);
  }
}

try {
  installGitHooks();
} catch (error) {
  console.warn('⚠️ Could not install git hooks:', error.message);
}

console.log("📋 Next steps:");
console.log("1. Restart OpenCode to load the plugin");
console.log("2. Run 'opencode agent list' to see StrRay agents");
console.log("3. Try '@architect analyze this code' or '@security-auditor scan' to test");
console.log("4. Hermes Agent users: restart Hermes to load MCP tools and hermes-agent skill");