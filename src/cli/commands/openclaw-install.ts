import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import { createRequire } from 'module';
import { frameworkLogger } from '../../core/framework-logger.js';
import { syncBuiltinSkills } from './skill-install.js';
import { OpenClawConfigLoader } from '../../integrations/openclaw/config.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(import.meta.url);
const wiring = require(path.join(__dirname, '..', '..', '..', 'scripts', 'node', 'bridge-mcp-wiring.cjs')) as {
  wireOpenClawBridge: (targetDir: string) => { count: number; path: string; method: string };
};

export function registerOpenClawCommands(openclawCmd: Command) {
  openclawCmd
    .command('install')
    .description('Install 0xRay OpenClaw integration (config + API server setup)')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--force', 'Force reinstall even if already present')
    .action(async (options) => {
      await installForOpenClaw({ dryRun: options.dryRun, force: options.force });
    });
}

interface OpenClawInstallOptions {
  force?: boolean;
  dryRun?: boolean;
}

async function installForOpenClaw(options: OpenClawInstallOptions = {}): Promise<void> {
  frameworkLogger.log('openclaw-integration', 'install-start', 'info', { options });

  const configPath = path.join(process.cwd(), '.xray', 'config', 'openclaw.json');

  if (options.dryRun) {
    console.log(`[OpenClaw] Dry run: Would create config at ${configPath}`);
    return;
  }

  const targetDir = process.cwd();

  try {
    const configExists = fs.existsSync(configPath);
    if (configExists && !options.force) {
      console.log(`[OpenClaw] Config already exists at ${configPath}.`);
      console.log('Use --force to overwrite sample config.');
    } else {
      const loader = new OpenClawConfigLoader(configPath);
      loader.createSampleConfig();
      const relative = path.relative(process.cwd(), configPath);
      console.log(`\x1b[32m✓ Created OpenClaw config at ${relative}\x1b[0m`);
    }

    const openclawSkillsDir = path.join(homedir(), '.openclaw', 'skills');
    const skillsCopied = syncBuiltinSkills(openclawSkillsDir);
    if (skillsCopied > 0) {
      console.log(`\x1b[32m✓ Synced ${skillsCopied} builtin skills to ~/.openclaw/skills/\x1b[0m`);
    }
    frameworkLogger.log('openclaw-integration', 'skills-synced', 'info', { count: skillsCopied });

    const wired = wiring.wireOpenClawBridge(targetDir);
    console.log(
      `\x1b[32m✓ Wired OpenClaw MCP servers (${wired.count} via ${wired.method}) → ${wired.path}\x1b[0m`,
    );
    console.log(`\x1b[32m✓ Consumer root → ${targetDir}\x1b[0m`);

    console.log('\n✅ 0xRay OpenClaw integration configured!');
    console.log('Run `openclaw mcp list` to verify MCP servers.');
    console.log('Edit `.xray/config/openclaw.json` for gateway URL, auth token, and device ID.');

  } catch (err: any) {
    frameworkLogger.log('openclaw-integration', 'install-error', 'error', { error: err.message });
    console.error('Failed to install OpenClaw integration:', err.message);
  }

  frameworkLogger.log('openclaw-integration', 'install-complete', 'info', {});
}
