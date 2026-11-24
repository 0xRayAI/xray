import { chmodSync, closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const seat = requireCjs(path.join(root, 'grok-bot', 'lib', 'near-seat.cjs')) as {
  KEY_CREATE_MODE: number;
  SEAT_UMASK: number;
  SEALED_MODE: number;
  VIEW_ACCOUNT_ATTEMPTS: number;
  VIEW_ACCOUNT_DELAY_MS: number;
  RPC_TIMEOUT_MS: number;
  rpcTimeoutMs: (opts?: { timeoutMs?: number }) => number;
  readLegacyKey: (file: string, accountId?: string) => KeyFile;
  createAccountArgv: (accountId: string) => string[];
  resolveNearBin: (opts?: { bin?: string; env?: { PATH?: string }; probeTimeoutMs?: number }) => string;
  runNearCli: (args: string[], opts?: { bin?: string; timeoutMs?: number }) => { status: number | null };
  credentialsHome: (opts: { credentialsHome?: string }) => string;
  legacyKeyPath: (dir: string, network: string, accountId: string) => string;
  fileCreateMode: (umask: number) => number;
  functionCallKeyArgv: (accountId: string, contractId: string, methodNames: string) => string[];
  prepareNearSeat: (opts: {
    accountId: string;
    seatHome: string;
    credentialsHome?: string;
    log?: (line: string) => void;
    stdout?: { write: (chunk: string) => void };
    fetch?: (url: string, init: { body: string; signal: AbortSignal }) => Promise<{ json: () => Promise<unknown> }>;
    methodNames?: string;
    viewAccount?: (accountId: string) => Promise<unknown>;
    viewAccessKeys?: (accountId: string) => Promise<{ keys: unknown[] }>;
    runners: {
      createAccount: (argv: string[]) => Promise<{ stdout: string; stderr: string; key: KeyFile }>;
      addFunctionCallKey: (argv: string[]) => Promise<{ stdout: string; key?: KeyFile }>;
    };
  }) => Promise<{
    mode: number;
    coldPath: string;
    grantArgv: string[] | null;
    addedKey: boolean;
    summaryPath: string;
    credentials: { files: number; dirs: number };
  }>;
  viewAccount: (accountId: string, opts: {
    attempts?: number;
    delayMs?: number;
    sleep?: (ms: number) => Promise<void>;
    timeoutMs?: number;
    fetch?: (url: string, init: { body: string; signal: AbortSignal }) => Promise<{ json: () => Promise<RpcBody> }>;
  }) => Promise<{ amount: string }>;
  writeCreatedFile: (dest: string, body: string) => number;
};

type KeyFile = {
  account_id: string;
  public_key: string;
  private_key: string;
};

type RpcBody = {
  result?: { amount?: string };
  error?: { cause?: { name?: string } };
};

const SECRET = 'ed25519:near-seat-test-secret-do-not-print';

function scratch(): string {
  return mkdtempSync(path.join(tmpdir(), 'near-seat-'));
}

async function grantAgainstPermission(permission: unknown, methodNames = 'ping'): Promise<{
  grants: number;
  addedKey: boolean;
  grantArgv: string[] | null;
}> {
  const home = scratch();
  const creds = scratch();
  const accountId = 'millfc1ca97ca3.testnet';
  const cold = path.join(home, 'near-cold', `${accountId}.json`);
  mkdirSync(path.dirname(cold), { recursive: true });
  writeFileSync(cold, `${JSON.stringify({
    account_id: accountId,
    public_key: 'ed25519:public-only',
    private_key: SECRET,
  })}\n`, { mode: 0o600 });
  let grants = 0;
  const logs: string[] = [];
  try {
    const result = await seat.prepareNearSeat({
      accountId,
      seatHome: home,
      credentialsHome: creds,
      methodNames,
      log: (line) => logs.push(line),
      viewAccount: async () => ({ amount: '10' }),
      viewAccessKeys: async () => ({
        keys: [{ access_key: { permission } }],
      }),
      runners: {
        createAccount: async () => { throw new Error('create must not run'); },
        addFunctionCallKey: async () => {
          grants += 1;
          return { status: 0, stdout: '' };
        },
      },
    });
    expect(logs.join('\n')).not.toContain(SECRET);
    return { grants, addedKey: result.addedKey, grantArgv: result.grantArgv };
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(creds, { recursive: true, force: true });
  }
}

async function grantAgainstMethods(methodNamesOnKey: string[], methodNames: string): Promise<{
  grants: number;
  addedKey: boolean;
  grantArgv: string[] | null;
}> {
  return grantAgainstPermission({
    FunctionCall: { receiver_id: 'millfc1ca97ca3.testnet', method_names: methodNamesOnKey },
  }, methodNames);
}

describe('near-seat', () => {
  it('seals the full-access key at 0600 and keeps the secret out of stdout and logs', async () => {
    const home = scratch();
    const logs: string[] = [];
    const stdout: string[] = [];
    const key: KeyFile = {
      account_id: 'millfc1ca97ca3.testnet',
      public_key: 'ed25519:public-only',
      private_key: SECRET,
    };
    try {
      const result = await seat.prepareNearSeat({
        accountId: key.account_id,
        seatHome: home,
        log: (line) => logs.push(line),
        stdout: { write: (chunk) => stdout.push(chunk) },
        viewAccount: async () => ({ amount: '10000000000000000000000000' }),
        runners: {
          createAccount: async () => ({
            status: 0,
            stdout: `created ${key.account_id}\n${SECRET}\n`,
            stderr: `seed ${SECRET}`,
            key,
          }),
          addFunctionCallKey: async () => ({ status: 0, stdout: `granted\n${SECRET}` }),
        },
      });
      expect(result.mode).toBe(seat.SEALED_MODE);
      expect(statSync(result.coldPath).mode & 0o777).toBe(0o600);
      const shown = `${logs.join('\n')}\n${stdout.join('')}`;
      expect(shown).not.toContain(SECRET);
      expect(shown).toContain('millfc1ca97ca3.testnet');
      expect(shown).toContain('[redacted]');
      expect(result.grantArgv).toContain('grant-function-call-access');
      expect(result.grantArgv).toContain('sign-with-legacy-keychain');
      expect(result.grantArgv).not.toContain('sign-with-keychain');
      expect(result.grantArgv).toContain('--function-names');
      expect(result.grantArgv).toContain('ping');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('shows why near-cli File::create is 0644 under umask 022 and 0600 under umask 077', () => {
    expect(seat.fileCreateMode(0o022)).toBe(0o644);
    expect(seat.fileCreateMode(seat.SEAT_UMASK)).toBe(0o600);
    expect(seat.KEY_CREATE_MODE).toBe(0o666);
    const home = scratch();
    const loose = path.join(home, 'loose.json');
    const prev = process.umask(0o022);
    try {
      const fd = openSync(loose, 'w', seat.KEY_CREATE_MODE);
      writeSync(fd, '{"private_key":"ed25519:loose"}\n');
      closeSync(fd);
      expect(statSync(loose).mode & 0o777).toBe(0o644);
    } finally {
      process.umask(prev);
      unlinkSync(loose);
      rmSync(home, { recursive: true, force: true });
    }
    const sealedHome = scratch();
    try {
      const mode = seat.writeCreatedFile(path.join(sealedHome, 'near-cold', 'a.json'), '{"private_key":"x"}\n');
      expect(mode).toBe(0o600);
    } finally {
      rmSync(sealedHome, { recursive: true, force: true });
    }
  });

  it('retries view_account 5 times, 1s apart, then stops', async () => {
    expect(seat.VIEW_ACCOUNT_ATTEMPTS).toBe(5);
    expect(seat.VIEW_ACCOUNT_DELAY_MS).toBe(1000);
    const delays: number[] = [];
    let calls = 0;
    const bodies: string[] = [];
    await expect(seat.viewAccount('missing.testnet', {
      fetch: async (_url, init) => {
        calls += 1;
        bodies.push(init.body);
        return { json: async () => ({ error: { cause: { name: 'UNKNOWN_ACCOUNT' } } }) };
      },
      sleep: async (ms) => { delays.push(ms); },
    })).rejects.toThrow('view_account failed after 5 attempts');
    expect(calls).toBe(5);
    expect(delays).toEqual([1000, 1000, 1000, 1000]);
    expect(bodies[0]).toContain('"request_type":"view_account"');
  });

  it('uses a 15s RPC timeout and keeps the 1s retry delay', async () => {
    expect(seat.RPC_TIMEOUT_MS).toBe(15000);
    expect(seat.VIEW_ACCOUNT_DELAY_MS).toBe(1000);
    expect(seat.rpcTimeoutMs({})).toBe(15000);
    const seen: number[] = [];
    const original = AbortSignal.timeout;
    AbortSignal.timeout = ((ms: number) => {
      seen.push(ms);
      return original(ms);
    }) as typeof AbortSignal.timeout;
    const prev = process.env.NEAR_RPC_TIMEOUT_MS;
    delete process.env.NEAR_RPC_TIMEOUT_MS;
    try {
      await seat.viewAccount('millfc1ca97ca3.testnet', {
        fetch: async () => ({ json: async () => ({ result: { amount: '1' } }) }),
        sleep: async () => { throw new Error('retry delay must not run on success'); },
      });
      expect(seen).toEqual([15000]);
      process.env.NEAR_RPC_TIMEOUT_MS = '8000';
      expect(seat.rpcTimeoutMs({})).toBe(8000);
      seen.length = 0;
      await seat.viewAccount('millfc1ca97ca3.testnet', {
        fetch: async () => ({ json: async () => ({ result: { amount: '1' } }) }),
        sleep: async () => {},
      });
      expect(seen).toEqual([8000]);
      seen.length = 0;
      await seat.viewAccount('millfc1ca97ca3.testnet', {
        timeoutMs: 2500,
        fetch: async () => ({ json: async () => ({ result: { amount: '1' } }) }),
        sleep: async () => {},
      });
      expect(seen).toEqual([2500]);
      expect(seat.rpcTimeoutMs({ timeoutMs: 2500 })).toBe(2500);
    } finally {
      AbortSignal.timeout = original;
      if (prev == null) delete process.env.NEAR_RPC_TIMEOUT_MS;
      else process.env.NEAR_RPC_TIMEOUT_MS = prev;
    }
  });

  it('keeps the passed account id ahead of the implicit account id', () => {
    const dir = scratch();
    const implicit = 'a'.repeat(64);
    const file = path.join(dir, 'named.testnet.json');
    writeFileSync(file, `${JSON.stringify({
      account_id: implicit,
      implicit_account_id: implicit,
      public_key: 'ed25519:public',
      private_key: SECRET,
    })}\n`);
    try {
      expect(seat.readLegacyKey(file, 'named.testnet').account_id).toBe('named.testnet');
      expect(seat.readLegacyKey(file).account_id).toBe(implicit);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips create when the key is on disk and view_account succeeds', async () => {
    const home = scratch();
    const creds = scratch();
    const accountId = 'named.testnet';
    const legacy = seat.legacyKeyPath(creds, 'testnet', accountId);
    mkdirSync(path.dirname(legacy), { recursive: true });
    writeFileSync(legacy, `${JSON.stringify({
      account_id: 'b'.repeat(64),
      implicit_account_id: 'b'.repeat(64),
      public_key: 'ed25519:public',
      private_key: SECRET,
    })}\n`);
    let creates = 0;
    try {
      const result = await seat.prepareNearSeat({
        accountId,
        seatHome: home,
        credentialsHome: creds,
        viewAccount: async () => ({ amount: '10' }),
        runners: {
          createAccount: async () => {
            creates += 1;
            throw new Error('create must not run');
          },
          addFunctionCallKey: async () => ({ status: 0, stdout: '' }),
        },
      });
      expect(creates).toBe(0);
      expect(result.addedKey).toBe(true);
      const cold = JSON.parse(readFileSync(result.coldPath, 'utf8')) as { account_id: string };
      expect(cold.account_id).toBe(accountId);
    } finally {
      rmSync(home, { recursive: true, force: true });
      rmSync(creds, { recursive: true, force: true });
    }
  });

  it('returns the account on a later view_account and does not call again', async () => {
    let calls = 0;
    const result = await seat.viewAccount('millfc1ca97ca3.testnet', {
      fetch: async () => {
        calls += 1;
        if (calls < 3) return { json: async () => ({ error: { cause: { name: 'UNKNOWN_ACCOUNT' } } }) };
        return { json: async () => ({ result: { amount: '10' } }) };
      },
      sleep: async () => {},
    });
    expect(result.amount).toBe('10');
    expect(calls).toBe(3);
  });

  it('seals a legacy keychain file when the CLI result has no key', async () => {
    const home = scratch();
    const creds = scratch();
    const logs: string[] = [];
    const stdout: string[] = [];
    const accountId = 'millfc1ca97ca3.testnet';
    const keyFile = seat.legacyKeyPath(creds, 'testnet', accountId);
    mkdirSync(path.dirname(keyFile), { recursive: true });
    writeFileSync(keyFile, `${JSON.stringify({
      account_id: accountId,
      public_key: 'ed25519:public-only',
      private_key: SECRET,
    })}\n`, { mode: 0o644 });
    const siblingDir = path.join(creds, 'testnet', 'extra');
    mkdirSync(siblingDir, { recursive: true, mode: 0o755 });
    const sibling = path.join(siblingDir, 'other.json');
    writeFileSync(sibling, '{"note":"sibling key file"}\n', { mode: 0o644 });
    chmodSync(creds, 0o755);
    chmodSync(path.dirname(keyFile), 0o755);
    chmodSync(siblingDir, 0o755);
    try {
      const result = await seat.prepareNearSeat({
        accountId,
        seatHome: home,
        credentialsHome: creds,
        log: (line) => logs.push(line),
        stdout: { write: (chunk) => stdout.push(chunk) },
        viewAccount: async () => ({ amount: '1' }),
        runners: {
          createAccount: async () => ({
            status: 0,
            stdout: 'account created\n',
            stderr: `key file written ${SECRET}`,
          }),
          addFunctionCallKey: async () => ({ status: 0, stdout: 'key added\n' }),
        },
      });
      expect(statSync(result.coldPath).mode & 0o777).toBe(0o600);
      expect(readFileSync(result.coldPath, 'utf8')).toContain(SECRET);
      expect(`${logs.join('\n')}${stdout.join('')}`).not.toContain(SECRET);
      expect(statSync(keyFile).mode & 0o777).toBe(0o600);
      expect(statSync(sibling).mode & 0o777).toBe(0o600);
      expect(statSync(siblingDir).mode & 0o777).toBe(0o700);
      expect(statSync(creds).mode & 0o777).toBe(0o700);
      expect(result.credentials.files).toBeGreaterThanOrEqual(2);
      const summary = JSON.parse(readFileSync(result.summaryPath, 'utf8')) as { keys: unknown };
      expect(JSON.stringify(summary)).not.toContain(SECRET);
      expect(JSON.stringify(summary)).not.toContain('private_key');
    } finally {
      rmSync(home, { recursive: true, force: true });
      rmSync(creds, { recursive: true, force: true });
    }
  });

  it('fails when the function-call key command is not status 0', async () => {
    const home = scratch();
    const logs: string[] = [];
    try {
      await expect(seat.prepareNearSeat({
        accountId: 'millfc1ca97ca3.testnet',
        seatHome: home,
        log: (line) => logs.push(line),
        viewAccount: async () => ({ amount: '1' }),
        runners: {
          createAccount: async () => ({
            status: 0,
            stdout: '',
            stderr: '',
            key: {
              account_id: 'millfc1ca97ca3.testnet',
              public_key: 'ed25519:public-only',
              private_key: SECRET,
            },
          }),
          addFunctionCallKey: async () => ({ status: 1, stdout: '', stderr: 'rejected' }),
        },
      })).rejects.toThrow('function-call key failed with status 1');
      expect(logs.join('\n')).not.toContain('function-call key granted');
      expect(logs.join('\n')).not.toContain(SECRET);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('aborts a hung view_account and restores umask', async () => {
    const prior = process.umask(0o022);
    const home = scratch();
    try {
      await expect(seat.viewAccount('hung.testnet', {
        attempts: 1,
        timeoutMs: 30,
        fetch: (_url, init) => new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' }));
          });
        }),
        sleep: async () => { throw new Error('sleep after the last attempt'); },
      })).rejects.toThrow('view_account failed after 1 attempts');
      await expect(seat.prepareNearSeat({
        accountId: 'millfc1ca97ca3.testnet',
        seatHome: home,
        viewAccount: async () => { throw new Error('rpc down'); },
        runners: {
          createAccount: async () => ({
            status: 0,
            stdout: '',
            stderr: '',
            key: {
              account_id: 'millfc1ca97ca3.testnet',
              public_key: 'ed25519:public-only',
              private_key: SECRET,
            },
          }),
          addFunctionCallKey: async () => ({ status: 0, stdout: '' }),
        },
      })).rejects.toThrow('rpc down');
      expect(process.umask()).toBe(0o022);
    } finally {
      process.umask(prior);
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('signs the grant with the same legacy keychain the create saved', () => {
    const accountId = 'millfc1ca97ca3.testnet';
    const create = seat.createAccountArgv(accountId);
    const grant = seat.functionCallKeyArgv(accountId, accountId, 'ping');
    expect(create).toContain('save-to-legacy-keychain');
    expect(grant).toContain('save-to-legacy-keychain');
    expect(grant).toContain('sign-with-legacy-keychain');
    expect(grant).not.toContain('sign-with-keychain');
  });

  it('skips account create when the cold key and the account already exist', async () => {
    const home = scratch();
    const creds = scratch();
    const accountId = 'millfc1ca97ca3.testnet';
    const cold = path.join(home, 'near-cold', `${accountId}.json`);
    mkdirSync(path.dirname(cold), { recursive: true });
    writeFileSync(cold, `${JSON.stringify({
      account_id: accountId,
      public_key: 'ed25519:public-only',
      private_key: SECRET,
    })}\n`);
    let created = 0;
    const logs: string[] = [];
    try {
      const result = await seat.prepareNearSeat({
        accountId,
        seatHome: home,
        log: (line) => logs.push(line),
        credentialsHome: creds,
        viewAccount: async () => ({ amount: '10' }),
        viewAccessKeys: async () => ({ keys: [] }),
        runners: {
          createAccount: async () => {
            created += 1;
            throw new Error('create must not run');
          },
          addFunctionCallKey: async () => ({ status: 0, stdout: '' }),
        },
      });
      expect(created).toBe(0);
      expect(result.grantArgv).toContain('sign-with-legacy-keychain');
      expect(logs.join('\n')).toContain('already exists');
      expect(logs.join('\n')).not.toContain(SECRET);
    } finally {
      rmSync(home, { recursive: true, force: true });
      rmSync(creds, { recursive: true, force: true });
    }
  });

  it('restores a missing legacy credentials file from the cold copy at 0600', async () => {
    const home = scratch();
    const creds = scratch();
    const accountId = 'millfc1ca97ca3.testnet';
    const cold = path.join(home, 'near-cold', `${accountId}.json`);
    mkdirSync(path.dirname(cold), { recursive: true });
    writeFileSync(cold, `${JSON.stringify({
      account_id: accountId,
      public_key: 'ed25519:public-only',
      private_key: SECRET,
    })}\n`, { mode: 0o600 });
    const logs: string[] = [];
    const stdout: string[] = [];
    let created = 0;
    try {
      const result = await seat.prepareNearSeat({
        accountId,
        seatHome: home,
        credentialsHome: creds,
        log: (line) => logs.push(line),
        stdout: { write: (chunk) => stdout.push(chunk) },
        viewAccount: async () => ({ amount: '10' }),
        viewAccessKeys: async () => ({ keys: [] }),
        runners: {
          createAccount: async () => {
            created += 1;
            throw new Error('create must not run');
          },
          addFunctionCallKey: async () => ({ status: 0, stdout: '' }),
        },
      });
      const legacy = seat.legacyKeyPath(creds, 'testnet', accountId);
      expect(created).toBe(0);
      expect(result.addedKey).toBe(true);
      expect(statSync(legacy).mode & 0o777).toBe(0o600);
      const shown = `${logs.join('\n')}${stdout.join('')}`;
      expect(readFileSync(legacy, 'utf8')).toContain(SECRET);
      expect(shown).not.toContain(SECRET);
      expect(shown).toContain('restored legacy keychain');
    } finally {
      rmSync(home, { recursive: true, force: true });
      rmSync(creds, { recursive: true, force: true });
    }
  });

  it('sends no add-key on a second reinstall when that contract key exists', async () => {
    const home = scratch();
    const creds = scratch();
    const accountId = 'millfc1ca97ca3.testnet';
    const logs: string[] = [];
    let grants = 0;
    let creates = 0;
    const key: KeyFile = {
      account_id: accountId,
      public_key: 'ed25519:public-only',
      private_key: SECRET,
    };
    const present = {
      keys: [{
        public_key: 'ed25519:function-call',
        access_key: {
          permission: {
            FunctionCall: {
              receiver_id: accountId,
              method_names: ['ping'],
            },
          },
        },
      }],
    };
    try {
      await seat.prepareNearSeat({
        accountId,
        seatHome: home,
        credentialsHome: creds,
        log: (line) => logs.push(line),
        viewAccount: async () => ({ amount: '10' }),
        viewAccessKeys: async () => ({ keys: [] }),
        runners: {
          createAccount: async () => {
            creates += 1;
            return { status: 0, stdout: '', stderr: '', key };
          },
          addFunctionCallKey: async () => {
            grants += 1;
            return { status: 0, stdout: '' };
          },
        },
      });
      const second = await seat.prepareNearSeat({
        accountId,
        seatHome: home,
        credentialsHome: creds,
        log: (line) => logs.push(line),
        viewAccount: async () => ({ amount: '10' }),
        viewAccessKeys: async () => present,
        runners: {
          createAccount: async () => {
            creates += 1;
            throw new Error('create must not run');
          },
          addFunctionCallKey: async () => {
            grants += 1;
            return { status: 0, stdout: '' };
          },
        },
      });
      expect(creates).toBe(1);
      expect(grants).toBe(1);
      expect(second.addedKey).toBe(false);
      expect(second.grantArgv).toBeNull();
      expect(logs.join('\n')).toContain('function-call key already present');
      expect(logs.join('\n')).not.toContain(SECRET);
    } finally {
      rmSync(home, { recursive: true, force: true });
      rmSync(creds, { recursive: true, force: true });
    }
  });

  it('queries view_access_key_list and skips add-key for the same contract', async () => {
    const home = scratch();
    const creds = scratch();
    const accountId = 'millfc1ca97ca3.testnet';
    const cold = path.join(home, 'near-cold', `${accountId}.json`);
    mkdirSync(path.dirname(cold), { recursive: true });
    writeFileSync(cold, `${JSON.stringify({
      account_id: accountId,
      public_key: 'ed25519:public-only',
      private_key: SECRET,
    })}\n`, { mode: 0o600 });
    const bodies: string[] = [];
    let grants = 0;
    try {
      const result = await seat.prepareNearSeat({
        accountId,
        seatHome: home,
        credentialsHome: creds,
        viewAccount: async () => ({ amount: '10' }),
        fetch: async (_url, init) => {
          bodies.push(init.body);
          return {
            json: async () => ({
              result: {
                keys: [{
                  access_key: {
                    permission: { FunctionCall: { receiver_id: accountId, method_names: ['ping'] } },
                  },
                }],
              },
            }),
          };
        },
        runners: {
          createAccount: async () => { throw new Error('create must not run'); },
          addFunctionCallKey: async () => {
            grants += 1;
            return { status: 0, stdout: '' };
          },
        },
      });
      expect(grants).toBe(0);
      expect(result.addedKey).toBe(false);
      expect(bodies).toHaveLength(1);
      expect(bodies[0]).toContain('"request_type":"view_access_key_list"');
      expect(bodies[0]).toContain(`"account_id":"${accountId}"`);
    } finally {
      rmSync(home, { recursive: true, force: true });
      rmSync(creds, { recursive: true, force: true });
    }
  });

  it('counts a function-call key whose method list is empty', async () => {
    const result = await grantAgainstMethods([], 'ping,pay');
    expect(result.grants).toBe(0);
    expect(result.addedKey).toBe(false);
  });

  it('counts a function-call key whose methods are a superset of the grant', async () => {
    const result = await grantAgainstMethods(['ping', 'pay'], 'ping');
    expect(result.grants).toBe(0);
    expect(result.addedKey).toBe(false);
  });

  it('counts a function_call key for the same contract', async () => {
    const result = await grantAgainstPermission({
      function_call: { receiver_id: 'millfc1ca97ca3.testnet', method_names: [] },
    });
    expect(result.grants).toBe(0);
    expect(result.addedKey).toBe(false);
  });

  it('does not count a function-call key for a different receiver', async () => {
    const result = await grantAgainstPermission({
      FunctionCall: { receiver_id: 'other.testnet', method_names: ['ping'] },
    });
    expect(result.grants).toBe(1);
    expect(result.addedKey).toBe(true);
  });

  it('does not count a full-access key as a function-call key', async () => {
    const result = await grantAgainstPermission('FullAccess');
    expect(result.grants).toBe(1);
    expect(result.addedKey).toBe(true);
  });

  it('adds a key when the existing function-call key is missing a granted method', async () => {
    const result = await grantAgainstMethods(['ping'], 'ping,pay');
    expect(result.grants).toBe(1);
    expect(result.addedKey).toBe(true);
    expect(result.grantArgv).toContain('--function-names');
    expect(result.grantArgv).toContain('ping,pay');
  });

  it('skips the archived JavaScript near and uses near-cli-rs', () => {
    const jsDir = scratch();
    const rsDir = scratch();
    const jsBin = path.join(jsDir, 'near');
    const rsBin = path.join(rsDir, 'near');
    writeFileSync(jsBin, '#!/bin/sh\necho 4.0.13\n');
    writeFileSync(rsBin, '#!/bin/sh\necho near-cli-rs 0.31.1\n');
    chmodSync(jsBin, 0o755);
    chmodSync(rsBin, 0o755);
    try {
      expect(seat.resolveNearBin({ env: { PATH: `${jsDir}${path.delimiter}${rsDir}` } })).toBe(rsBin);
    } finally {
      rmSync(jsDir, { recursive: true, force: true });
      rmSync(rsDir, { recursive: true, force: true });
    }
  });

  it('skips a near that does not exit and uses the next near-cli-rs', () => {
    const hangDir = scratch();
    const rsDir = scratch();
    const hangBin = path.join(hangDir, 'near');
    const rsBin = path.join(rsDir, 'near');
    writeFileSync(hangBin, '#!/bin/sh\nsleep 30\n');
    writeFileSync(rsBin, '#!/bin/sh\necho near-cli-rs 0.31.1\n');
    chmodSync(hangBin, 0o755);
    chmodSync(rsBin, 0o755);
    const started = Date.now();
    try {
      expect(seat.resolveNearBin({
        env: { PATH: `${hangDir}${path.delimiter}${rsDir}` },
        probeTimeoutMs: 200,
      })).toBe(rsBin);
      expect(Date.now() - started).toBeLessThan(5000);
    } finally {
      rmSync(hangDir, { recursive: true, force: true });
      rmSync(rsDir, { recursive: true, force: true });
    }
  });

  it('stops a near command that does not exit', () => {
    const dir = scratch();
    const bin = path.join(dir, 'near');
    writeFileSync(bin, '#!/bin/sh\nsleep 30\n');
    chmodSync(bin, 0o755);
    const started = Date.now();
    try {
      const result = seat.runNearCli(['--version'], { bin, timeoutMs: 200 });
      expect(result.status).not.toBe(0);
      expect(Date.now() - started).toBeLessThan(5000);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('names the install when PATH has only the archived JavaScript near', () => {
    const jsDir = scratch();
    const jsBin = path.join(jsDir, 'near');
    writeFileSync(jsBin, '#!/bin/sh\necho 4.0.13\n');
    chmodSync(jsBin, 0o755);
    try {
      expect(() => seat.resolveNearBin({ env: { PATH: jsDir } })).toThrow(/near-cli-rs 0.31.1/);
    } finally {
      rmSync(jsDir, { recursive: true, force: true });
    }
  });

  it('builds the faucet create command from the measured flow', () => {
    expect(seat.createAccountArgv('millfc1ca97ca3.testnet')).toEqual([
      'account',
      'create-account',
      'sponsor-by-faucet-service',
      'millfc1ca97ca3.testnet',
      'autogenerate-new-keypair',
      'save-to-legacy-keychain',
      'network-config',
      'testnet',
      'create',
    ]);
  });
});
