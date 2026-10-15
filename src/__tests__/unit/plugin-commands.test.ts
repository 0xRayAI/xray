import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseYaml } from '../../cli/commands/plugin-commands.js';

const EXAMPLE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../examples/plugins/mcp-image-recognition/plugin.yaml',
);

describe('parseYaml plugin manifest', () => {
  it('reads the image-recognition example as maps and lists', () => {
    const manifest = parseYaml(readFileSync(EXAMPLE, 'utf8'));

    expect(manifest.name).toBe('mcp-image-recognition');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.capabilities).toEqual([
      'image-analysis',
      'object-detection',
      'text-recognition',
      'scene-understanding',
    ]);

    const runtime = manifest.runtime as Record<string, unknown>;
    expect(runtime.command).toBe('npx');
    expect(runtime.args).toEqual(['-y', '@modelcontextprotocol/server-image-recognition']);

    const tools = manifest.tools as Array<Record<string, unknown>>;
    expect(tools).toHaveLength(4);
    expect(tools[0]).toEqual({
      name: 'recognize-image',
      description: 'Analyze an image and identify objects, scenes, and text',
    });

    const routing = manifest.routing as Array<Record<string, unknown>>;
    expect(routing[0]?.keywords).toEqual(['image', 'photo', 'picture', 'visual']);
    expect(routing[0]?.agent).toBe('multimodal-looker');
  });
});
