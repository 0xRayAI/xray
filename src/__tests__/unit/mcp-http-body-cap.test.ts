/**
 * HTTP MCP transports pass a finite body cap. The SDK skips the cap when
 * the caller supplies parsedBody, so the option still has to be set.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function source(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), 'utf8');
}

const HTTP_SERVERS = [
  'src/mcps/governance.server.ts',
  'src/mcps/knowledge-skills/skill-invocation.server.ts',
];

describe('HTTP MCP body cap', () => {
  it('passes a finite maxRequestBodySize on every streamable HTTP transport', () => {
    for (const rel of HTTP_SERVERS) {
      const text = source(rel);
      const constructors = text.match(/new StreamableHTTPServerTransport\(/g) ?? [];
      const caps = text.match(/maxRequestBodySize:\s*MCP_MAX_REQUEST_BODY_SIZE/g) ?? [];
      expect(constructors.length).toBeGreaterThan(0);
      expect(caps.length).toBe(constructors.length);
      expect(text).toContain('export const MCP_MAX_REQUEST_BODY_SIZE = 4194304;');
    }
  });

  it('pins each HTTP listen host to MCP_HOST or loopback', () => {
    for (const rel of HTTP_SERVERS) {
      const text = source(rel);
      expect(text).toContain('const mcpHost = process.env.MCP_HOST || "127.0.0.1";');
      expect(text).toContain('app.listen(port, mcpHost,');
    }
  });

  it('pins the skill-invocation express app host the same way', () => {
    const text = source('src/mcps/knowledge-skills/skill-invocation.server.ts');
    expect(text).toContain('createMcpExpressApp({ host: mcpHost })');
  });
});
