import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ctStamp,
  handoffFromText,
  notifyBifrost,
  ownerLine,
  promptNote,
  refsFromText,
} from '../../integrations/hooks/bifrost-send.mjs';

const KEY = `ghs_${'a'.repeat(40)}`;

function liveFetch(calls: Array<{ url: string; body: string; auth: string }>) {
  return async (url: string, init: { method?: string; body?: string; headers?: { authorization?: string } } = {}) => {
    if (String(url).endsWith('/healthz')) {
      return { status: 200, json: async () => ({ ok: true, board: 'live' }) };
    }
    calls.push({ url: String(url), body: String(init.body || ''), auth: init.headers?.authorization || '' });
    return { status: 200, json: async () => ({ ok: true }) };
  };
}

describe('bifrost send', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('stamps Chicago time with a numeric offset', () => {
    expect(ctStamp(new Date('2026-10-24T18:00:00Z'))).toBe('2026-10-24T13:00:00-05:00');
  });

  it('names an issue, a pull, and a handoff without keeping the prompt', () => {
    const text = 'please fix hunter2 on 0xRayAI/xray#564 and https://github.com/0xRayAI/xray/pull/604';
    const refs = refsFromText(text);
    expect(refs.issues.map((row) => row.tag)).toEqual(['issue:0xRayAI/xray#564']);
    expect(refs.prs.map((row) => row.tag)).toEqual(['pr:0xRayAI/xray#604']);
    const packet = handoffFromText(
      'live-inbox arch1 --handoff critic --pr 0xRayAI/xray#604 --kind ready --sha abcdef1',
      'arch1',
      new Date('2026-10-24T18:00:00Z'),
    );
    expect(packet?.id).toBe('handoff:0xrayai/xray#604:ready:abcdef1');
    expect(packet?.from).toBe('arch1');
    expect(packet?.type).toBe('packet');
    expect(JSON.stringify(packet)).not.toContain('hunter2');
  });

  it('sends nothing when the board is quiet or the seat is unset', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-send-'));
    dirs.push(root);
    fs.writeFileSync(path.join(root, 'arch1.key'), `${KEY}\n`, { mode: 0o600 });
    const quiet = await notifyBifrost({
      root,
      phase: 'start',
      env: { LIVE_URL: 'https://bifrost.example', XRAY_SEAT: 'arch1', SEAT_KEYS_DIR: root },
      fetchImpl: async () => ({ status: 200, json: async () => ({ ok: true, board: 'building' }) }),
      now: new Date('2026-10-24T18:00:00Z'),
    });
    expect(quiet).toEqual({ sent: [], reason: 'quiet' });
    const emptyHome = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-home-'));
    dirs.push(emptyHome);
    fs.mkdirSync(path.join(emptyHome, '.burst', 'seat-keys'), { recursive: true });
    const off = await notifyBifrost({
      root,
      phase: 'start',
      env: {},
      home: emptyHome,
      fetchImpl: async () => { throw new Error('called'); },
    });
    expect(off.reason).toBe('off');
  });

  it('posts the turn on the suit board when the shell set nothing and one seat key exists', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-home-'));
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-send-'));
    dirs.push(home, root);
    const keys = path.join(home, '.burst', 'seat-keys');
    fs.mkdirSync(keys, { recursive: true });
    fs.writeFileSync(path.join(keys, 'arch1.key'), `${KEY}\n`, { mode: 0o600 });
    const calls: Array<{ url: string; body: string; auth: string }> = [];
    const now = new Date('2026-10-24T18:00:00Z');
    const sent = await notifyBifrost({
      root,
      phase: 'start',
      env: {},
      home,
      fetchImpl: liveFetch(calls),
      now,
    });
    expect(sent.sent).toEqual(['start']);
    expect(calls[0].url).toBe('https://bifrost.0xray.dev/activity');
    const accepted = await notifyBifrost({
      root,
      phase: 'end',
      env: {},
      home,
      fetchImpl: async (url: string, init: { body?: string; headers?: { authorization?: string } } = {}) => {
        if (String(url).endsWith('/healthz')) return { status: 200, json: async () => ({ ok: true, board: 'live' }) };
        calls.push({ url: String(url), body: String(init.body || ''), auth: init.headers?.authorization || '' });
        return { status: 202, json: async () => ({ ok: true }) };
      },
      now,
    });
    expect(accepted.sent).toEqual(['end']);
    expect(calls[0].auth).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(calls[0].body)).toMatchObject({ kind: 'turn', action: 'start' });
  });

  it('posts activity, the issue, the pull, and the packet once while the board is live', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-send-'));
    const keys = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-keys-'));
    dirs.push(root, keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), `${KEY}\n`, { mode: 0o600 });
    const env = { LIVE_URL: 'https://bifrost.example/board', XRAY_SEAT: 'arch1', SEAT_KEYS_DIR: keys };
    const now = new Date('2026-10-24T18:00:00Z');
    const calls: Array<{ url: string; body: string; auth: string }> = [];
    const fetchImpl = liveFetch(calls);
    const start = await notifyBifrost({ root, phase: 'start', env, fetchImpl, now });
    expect(start.sent).toEqual(['start']);
    const work = await notifyBifrost({
      root,
      phase: 'work',
      env,
      fetchImpl,
      now,
      text: 'hunter2 https://github.com/0xRayAI/xray/issues/564 https://github.com/0xRayAI/xray/pull/604 --handoff critic --pr 0xRayAI/xray#604 --kind ready --sha abcdef1',
    });
    expect(work.sent).toEqual(['issue:0xRayAI/xray#564', 'pr:0xRayAI/xray#604', 'packet']);
    const again = await notifyBifrost({
      root,
      phase: 'work',
      env,
      fetchImpl,
      now,
      text: 'https://github.com/0xRayAI/xray/issues/564',
    });
    expect(again.sent).toEqual([]);
    const end = await notifyBifrost({ root, phase: 'end', env, fetchImpl, now });
    expect(end.sent).toEqual(['end']);
    const bodies = calls.map((call) => call.body).join('\n');
    expect(bodies).not.toContain(KEY);
    expect(bodies).not.toContain('hunter2');
    expect(calls[0].url).toBe('https://bifrost.example/activity');
    expect(calls[0].auth).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(calls[0].body)).toMatchObject({ kind: 'turn', action: 'start', t_ct: '2026-10-24T13:00:00-05:00' });
    const packet = JSON.parse(calls.find((call) => call.url.endsWith('/inbox'))?.body || '{}');
    expect(packet.lines[0].from).toBe('arch1');
    expect(packet.lines[0].type).toBe('packet');
    expect(packet.lines[0].id).toBe('handoff:0xrayai/xray#604:ready:abcdef1');
  });

  it('posts the owner line on the activity feed and keeps tool text off it', async () => {
    expect(promptNote('ship it 🎉 now\nplease')).toBe('ship it now please');
    expect(ownerLine({ user_prompt: 'the board accepts activity feed' })).toBe('the board accepts activity feed');
    expect(ownerLine({ prompt: 'kept', user_prompt: 'other' })).toBe('kept');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-send-'));
    const keys = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-keys-'));
    dirs.push(root, keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), `${KEY}\n`, { mode: 0o600 });
    const env = { LIVE_URL: 'https://bifrost.example/board', XRAY_SEAT: 'arch1', SEAT_KEYS_DIR: keys };
    const now = new Date('2026-10-24T18:00:00Z');
    const calls: Array<{ url: string; body: string; auth: string }> = [];
    const fetchImpl = liveFetch(calls);
    const said = await notifyBifrost({
      root,
      phase: 'prompt',
      env,
      fetchImpl,
      now,
      text: 'i do not see my messages to you on the board why?',
    });
    expect(said.sent).toEqual(['prompt']);
    const line = JSON.parse(calls[0].body);
    expect(line).toMatchObject({
      kind: 'prompt',
      action: 'sent',
      from: 'owner',
      to: 'arch1',
      seat: 'arch1',
      note: 'i do not see my messages to you on the board why?',
      t_ct: '2026-10-24T13:00:00-05:00',
    });
    expect(calls[0].url).toBe('https://bifrost.example/activity');
    const again = await notifyBifrost({
      root,
      phase: 'prompt',
      env,
      fetchImpl,
      now,
      text: 'i do not see my messages to you on the board why?',
    });
    expect(again.sent).toEqual([]);
    const tool = await notifyBifrost({
      root,
      phase: 'work',
      env,
      fetchImpl,
      now,
      text: 'npm test hunter2',
    });
    expect(tool.sent).toEqual([]);
    expect(calls.map((call) => call.body).join('\n')).not.toContain('hunter2');
    expect(calls.map((call) => call.body).join('\n')).not.toContain(KEY);
  });
});
