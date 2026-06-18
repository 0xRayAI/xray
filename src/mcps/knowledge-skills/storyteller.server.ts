/**
 * Storyteller MCP Server
 *
 * Returns storyteller SKILL.md guidance plus a session-aware writing prompt.
 * The host LLM writes the story; this server supplies the contract.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XrayKnowledgeSkillBase } from '../shared/knowledge-skill-base.js';

const STORY_TYPES = ['reflection', 'saga', 'journey', 'narrative'] as const;
type StoryType = (typeof STORY_TYPES)[number];

interface WriteStoryArgs {
  title?: string;
  context?: Record<string, unknown>;
  framework?: string;
  output?: string;
}

function resolveSkillMd(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '../../../skills/storyteller/SKILL.md'),
    join(here, '../../skills/storyteller/SKILL.md'),
    join(process.cwd(), 'node_modules/0xray/dist/skills/storyteller/SKILL.md'),
    join(process.cwd(), 'node_modules/xray/dist/skills/storyteller/SKILL.md'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
  }

  return '# Storyteller\n\nWrite warmly candid technical reflections with scene-first openings.';
}

function getStoryMeta(storyType: StoryType) {
  const defaults: Record<
    StoryType,
    { location: string; min_words: number; ideal_words: number; framework: string }
  > = {
    reflection: {
      location: 'docs/reflections/',
      min_words: 2000,
      ideal_words: 5000,
      framework: 'three_act_structure',
    },
    saga: {
      location: 'docs/reflections/deep/',
      min_words: 5000,
      ideal_words: 15000,
      framework: 'hero_journey',
    },
    journey: {
      location: 'docs/reflections/deep/',
      min_words: 1500,
      ideal_words: 4000,
      framework: 'three_act_structure',
    },
    narrative: {
      location: 'docs/reflections/',
      min_words: 1000,
      ideal_words: 3000,
      framework: 'three_act_structure',
    },
  };
  return defaults[storyType];
}

function gitContext(): string {
  try {
    const commits = execSync('git log --oneline -20 2>/dev/null', { encoding: 'utf-8' });
    const files = execSync(
      'git diff --name-only HEAD~10 2>/dev/null || git ls-files 2>/dev/null | head -50',
      { encoding: 'utf-8' },
    );
    return `Recent commits:\n${commits}\n\nRecent files:\n${files}`;
  } catch {
    return 'No git context available in this workspace.';
  }
}

function buildPrompt(
  storyType: StoryType,
  title: string,
  meta: ReturnType<typeof getStoryMeta>,
  extraContext?: Record<string, unknown>,
): string {
  const contextBlock = extraContext
    ? `\n## Provided context\n${JSON.stringify(extraContext, null, 2)}\n`
    : '';

  return `Write a ${storyType} titled "${title}".

## Requirements
- Framework: ${meta.framework}
- Target length: ${meta.ideal_words} words (minimum: ${meta.min_words})
- Save to: ${meta.location}
- Follow storyteller SKILL.md voice (warmly candid, scene-first, no executive summary)
- Include Key Takeaways and What Next sections

## Session / repo context
${gitContext()}
${contextBlock}

Write the complete ${storyType} now.`;
}

function writeStoryTool(storyType: StoryType, args: WriteStoryArgs) {
  const meta = getStoryMeta(storyType);
  if (args.framework) meta.framework = args.framework;

  const title =
    args.title ??
    `${storyType.charAt(0).toUpperCase() + storyType.slice(1)} - ${new Date().toISOString().split('T')[0]}`;
  const skillMd = resolveSkillMd();
  const prompt = buildPrompt(storyType, title, meta, args.context);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${storyType}-${slug}-${new Date().toISOString().split('T')[0]}.md`;
  const outputPath = args.output ?? join(meta.location, filename);

  const outputDir = join(process.cwd(), dirname(outputPath));
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const fullPath = join(process.cwd(), outputPath);
  const frontmatter = `---
story_type: ${storyType}
title: "${title}"
framework: ${meta.framework}
target_words: ${meta.ideal_words}
---

`;

  writeFileSync(fullPath, `${frontmatter}\n${prompt}\n`, 'utf-8');

  return {
    content: [
      {
        type: 'text' as const,
        text: [
          `Storyteller ${storyType} brief prepared.`,
          `Output template: ${outputPath}`,
          '',
          '--- SKILL (excerpt) ---',
          skillMd.slice(0, 4000),
          skillMd.length > 4000 ? '\n...(truncated; full SKILL.md on disk)' : '',
          '',
          '--- WRITING PROMPT ---',
          prompt,
          '',
          'Host LLM: write the full story into the output path using the prompt above.',
        ].join('\n'),
      },
    ],
  };
}

class StorytellerServer extends XrayKnowledgeSkillBase {
  constructor() {
    super('storyteller', '1.0.0');

    const writeSchema = {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Story title' },
        context: { type: 'object', description: 'Session context (commits, changes, notes)' },
        framework: { type: 'string', description: 'Storytelling framework override' },
        output: { type: 'string', description: 'Relative output path' },
      },
    };

    this.tools = STORY_TYPES.map((storyType) => ({
      name: `write_${storyType}`,
      description: `Prepare ${storyType} story brief using storyteller SKILL.md`,
      inputSchema: writeSchema,
    }));

    this.handlers = {
      write_reflection: async (args) => writeStoryTool('reflection', args as WriteStoryArgs),
      write_saga: async (args) => writeStoryTool('saga', args as WriteStoryArgs),
      write_journey: async (args) => writeStoryTool('journey', args as WriteStoryArgs),
      write_narrative: async (args) => writeStoryTool('narrative', args as WriteStoryArgs),
    };

    this.setupToolHandlers();
  }
}

if (import.meta.url === `file://${fileURLToPath(import.meta.url)}`) {
  const server = new StorytellerServer();
  server.run().catch((error) => {
    process.stderr.write(`FATAL: ${String(error)}\n`);
    process.exit(1);
  });
}

export { StorytellerServer };