import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
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
  createAccountArgv: (accountId: string) => string[];
  credentialsHome: (opts: { credentialsHome?: string }) => string;
  legacyKeyPath: (dir: string, network: string, accountId: string) => string;
  fileCreateMode: (umask: number) => number;
  functionCallKeyArgv: (accountId: string, contractId: string, methodNames: string) => string[];
  prepareNearSeat: (opts: {
    accountId: string;
    seatHome: string;
    log?: (line: string) => void;
    stdout?: { write: (chunk: string) => void };
    viewAccount?: (accountId: string) => Promise<unknown>;
    runners: {
      createAccount: (argv: string[]) => Promise<{ stdout: string; stderr: string; key: KeyFile }>;
      addFunctionCallKey: (argv: string[]) => Promise<{ stdout: string; key?: KeyFile }>;
    };
  }) => Promise<{ mode: number; coldPath: string; grantArgv: string[] }>;
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
    })}\n`);
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
        viewAccount: async () => ({ amount: '10' }),
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
