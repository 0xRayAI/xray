import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('vitest HOME isolation', () => {
  it('points HOME at a temp dir, not the passwd home', () => {
    const home = process.env.HOME;
    const passwd = os.userInfo().homedir;
    expect(home).toBeTruthy();
    expect(path.resolve(home!)).not.toBe(path.resolve(passwd));
    expect(path.resolve(home!).startsWith(path.resolve(os.tmpdir()) + path.sep)).toBe(true);
  });
});
