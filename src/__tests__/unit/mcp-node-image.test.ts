import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('root MCP Node image', () => {
  it('builds from the patched Node 24 image instead of nixpacks', () => {
    const railway = JSON.parse(readFileSync(path.join(root, 'railway.json'), 'utf8')) as {
      build: { builder: string; dockerfilePath: string; nixpacksConfig?: unknown };
      deploy: { startCommand: string };
    };
    const docker = readFileSync(path.join(root, 'Dockerfile'), 'utf8');
    expect(railway.build.builder).toBe('DOCKERFILE');
    expect(railway.build.dockerfilePath).toBe('Dockerfile');
    expect(railway.build.nixpacksConfig).toBeUndefined();
    expect(railway.deploy.startCommand).toBe('node mcp-server.mjs');
    expect(docker).toMatch(/^FROM node:24\.22\.1-bookworm-slim$/m);
    expect(docker).toMatch(/^RUN npm ci --ignore-scripts$/m);
    const installAt = docker.indexOf('RUN npm ci --ignore-scripts');
    const sourceAt = docker.indexOf('COPY . .');
    expect(installAt).toBeGreaterThan(-1);
    expect(sourceAt).toBeGreaterThan(installAt);
  });
});
