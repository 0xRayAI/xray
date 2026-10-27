import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { materializeOpencode } = require('../../../scripts/node/materialize-opencode-mirror.cjs') as {
  materializeOpencode: (root: string) => void;
};

describe('materialize opencode mirror', () => {
  let root = '';

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = '';
  });

  it('merges src/opencode into an existing .opencode without nesting', () => {
    root = mkdtempSync(join(tmpdir(), 'oc-mirror-'));
    mkdirSync(join(root, 'src', 'opencode', 'agents'), { recursive: true });
    writeFileSync(join(root, 'src', 'opencode', 'agents', 'boot.yml'), 'name: boot\n');
    writeFileSync(join(root, 'src', 'opencode', 'codex.codex'), 'term\n');
    mkdirSync(join(root, '.opencode', 'hooks'), { recursive: true });
    writeFileSync(join(root, '.opencode', 'init.sh'), '#!/bin/sh\n');

    materializeOpencode(root);

    expect(existsSync(join(root, '.opencode', 'agents', 'boot.yml'))).toBe(true);
    expect(existsSync(join(root, '.opencode', 'codex.codex'))).toBe(true);
    expect(existsSync(join(root, '.opencode', 'init.sh'))).toBe(true);
    expect(existsSync(join(root, '.opencode', 'hooks'))).toBe(true);
    expect(existsSync(join(root, '.opencode', 'opencode'))).toBe(false);
  });

  it('npm test and the build both run this mirror', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: { test: string; build: string };
    };
    expect(pkg.scripts.test).toContain('scripts/node/materialize-opencode-mirror.cjs');
    expect(pkg.scripts.build).toContain('scripts/node/materialize-opencode-mirror.cjs');
    expect(pkg.scripts.build).not.toContain('cp -r src/opencode/');
  });

  it('copies skills into .opencode only on the OpenCode pack line', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: { test: string; build: string; 'build:opencode-skills': string };
    };
    expect(pkg.scripts['build:opencode-skills']).toBe(
      'mkdir -p .opencode/skills && cp -R src/skills/. .opencode/skills/',
    );
    expect(pkg.scripts.build).toContain('npm run build:opencode-skills');
    expect(pkg.scripts.test).not.toContain('build:opencode-skills');
    expect(pkg.scripts.test).not.toContain('.opencode/skills');
  });
});
