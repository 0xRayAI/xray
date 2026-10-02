/**
 * CLI command: 0xray grok install
 *
 * Helps users register 0xRay MCP servers with the Grok CLI.
 */

import { Command } from 'commander';

export function registerGrokCommands(grokCmd: Command) {
  grokCmd
    .command('install')
    .description('Install 0xRay as a first-class Grok CLI plugin (hooks + MCP servers)')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--force', 'Force reinstall even if already present')
    .action(async (options) => {
      const { installForGrokCLI } = await import('../../integrations/grok/grok-cli.js');
      await installForGrokCLI({ dryRun: options.dryRun, force: options.force });
    });
}
