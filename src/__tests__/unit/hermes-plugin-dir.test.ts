import { describe, expect, it } from 'vitest';
import { hermesPluginDir } from '../../cli/commands/hermes-install.js';

describe('hermes plugin directory', () => {
  it('uses the project path for a temp folder even when HOME is the machine home', () => {
    const dir = hermesPluginDir('/tmp/cold', false, '/Users/blaze', true);
    expect(dir).toBe('/tmp/cold/.hermes/plugins/xray-hermes');
  });

  it('uses the machine home when the folder is not temp and HOME is not isolated', () => {
    const dir = hermesPluginDir('/Users/blaze/dev/app', false, '/Users/blaze', false);
    expect(dir).toBe('/Users/blaze/.hermes/plugins/xray-hermes');
  });
});
