// #580: a Railway volume is root-mounted at container start. Build-time chown
// of /data does not survive. The entrypoint chowns, then drops to image node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const entryPath = path.join(APP, 'docker-entrypoint.sh');

function read(name) {
  return fs.readFileSync(path.join(APP, name), 'utf8');
}

test('image stays on the Node 24 pin and does not drop at build time', () => {
  const docker = read('Dockerfile');
  assert.match(docker, /^FROM node:24\.22\.1-bookworm-slim\s*$/m);
  assert.equal(docker.includes('node:20'), false);
  assert.equal(docker.includes('22.23.4'), false);
  assert.equal(/^USER\s+/m.test(docker), false);
  const runs = docker.split('\n').filter((line) => /^\s*RUN\b/.test(line) || /^\s*&&/.test(line));
  assert.equal(runs.some((line) => /chown\b/.test(line)), false);
  assert.match(docker, /build-time chown of \/data/);
  assert.match(docker, /does not survive/);
  assert.match(docker, /gosu/);
  assert.match(docker, /COPY docker-entrypoint\.sh/);
  assert.match(docker, /ENTRYPOINT \["\/app\/docker-entrypoint\.sh"\]/);
});

test('Railway start command is the entrypoint, because it replaces ENTRYPOINT', () => {
  const railway = JSON.parse(read('railway.json'));
  assert.equal(railway.deploy.startCommand, '/app/docker-entrypoint.sh');
  const ts = read('.railway/railway.ts');
  assert.match(ts, /start: "\/app\/docker-entrypoint\.sh"/);
  const deploy = read('deploy.sh');
  assert.match(deploy, /"\$APP"\/docker-entrypoint\.sh/);
  assert.equal(fs.existsSync(entryPath), true);
});

test('entrypoint chowns the mounted data dir then execs gosu node', () => {
  const entry = fs.readFileSync(entryPath, 'utf8');
  assert.match(entry, /build-time chown of \/data/);
  assert.match(entry, /does not survive/);
  assert.match(entry, /MESH_DATA_DIR/);
  assert.match(entry, /RAILWAY_VOLUME_MOUNT_PATH/);
  assert.match(entry, /chown -R --no-dereference node:node/);
  assert.match(entry, /exec gosu node "\$@"/);
  assert.match(entry, /refusing to chown/);
});

function sudoOk() {
  return spawnSync('sudo', ['-n', 'true'], { encoding: 'utf8' }).status === 0;
}

function ensureNodeUser() {
  const have = spawnSync('getent', ['passwd', 'node'], { encoding: 'utf8' });
  if (have.status === 0) return;
  const added = spawnSync('sudo', ['-n', 'useradd', '--system', '--user-group', '--no-create-home', '--shell', '/usr/sbin/nologin', 'node'], { encoding: 'utf8' });
  assert.equal(added.status, 0, added.stderr);
}

test('as root, entrypoint chowns the volume and the write dir, then drops via gosu', () => {
  assert.equal(sudoOk(), true, 'passwordless sudo is required to prove the root chown');
  ensureNodeUser();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'data-vol-'));
  const bin = path.join(root, 'bin');
  const mount = path.join(root, 'mount');
  const write = path.join(mount, 'mesh');
  fs.mkdirSync(bin);
  fs.chmodSync(root, 0o755);
  fs.chmodSync(bin, 0o755);
  const gosuLog = path.join(root, 'gosu-user');
  fs.writeFileSync(path.join(bin, 'gosu'), `#!/bin/sh
printf '%s\\n' "$1" > ${JSON.stringify(gosuLog)}
shift
exec runuser -u node -- "$@"
`);
  fs.chmodSync(path.join(bin, 'gosu'), 0o755);
  fs.writeFileSync(path.join(bin, 'mark.sh'), `#!/bin/sh
id -un > "$1/who"
: > "$1/wrote"
`);
  fs.chmodSync(path.join(bin, 'mark.sh'), 0o755);
  spawnSync('sudo', ['-n', 'mkdir', '-p', path.join(mount, 'feed')], { encoding: 'utf8' });
  const feed = path.join(mount, 'feed', 'github-events.json');
  spawnSync('sudo', ['-n', 'tee', feed], { input: '{}\n', encoding: 'utf8' });
  spawnSync('sudo', ['-n', 'chown', '-R', 'root:root', mount], { encoding: 'utf8' });
  const run = spawnSync('sudo', ['-n', 'env',
    `PATH=${bin}:/usr/sbin:/usr/bin:/bin`,
    `MESH_DATA_DIR=${write}`,
    `RAILWAY_VOLUME_MOUNT_PATH=${mount}`,
    'sh', entryPath, path.join(bin, 'mark.sh'), write,
  ], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr + run.stdout);
  assert.equal(fs.readFileSync(gosuLog, 'utf8').trim(), 'node');
  assert.equal(fs.readFileSync(path.join(write, 'who'), 'utf8').trim(), 'node');
  assert.equal(fs.existsSync(path.join(write, 'wrote')), true);
  const owner = spawnSync('stat', ['-c', '%U:%G', feed], { encoding: 'utf8' });
  assert.equal(owner.stdout.trim(), 'node:node');
  const dirOwner = spawnSync('stat', ['-c', '%U:%G', write], { encoding: 'utf8' });
  assert.equal(dirOwner.stdout.trim(), 'node:node');
  spawnSync('sudo', ['-n', 'rm', '-rf', root]);
});

test('root entrypoint refuses system paths and a symlink that leaves the data dir', () => {
  assert.equal(sudoOk(), true, 'passwordless sudo is required to prove the refusal');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'data-vol-no-'));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'gosu'), '#!/bin/sh\nexit 97\n');
  fs.chmodSync(path.join(bin, 'gosu'), 0o755);
  for (const dir of ['/', '/app', 'relative', '/data/../etc']) {
    const run = spawnSync('sudo', ['-n', 'env',
      `PATH=${bin}:/usr/sbin:/usr/bin:/bin`,
      `MESH_DATA_DIR=${dir}`,
      'sh', entryPath,
    ], { encoding: 'utf8' });
    assert.notEqual(run.status, 0, dir);
    assert.match(run.stderr, /refusing to chown|must be absolute/, dir);
  }
  const link = path.join(root, 'link');
  fs.symlinkSync('/etc', link);
  const via = spawnSync('sudo', ['-n', 'env',
    `PATH=${bin}:/usr/sbin:/usr/bin:/bin`,
    `MESH_DATA_DIR=${link}`,
    'sh', entryPath,
  ], { encoding: 'utf8' });
  assert.notEqual(via.status, 0, via.stderr);
  assert.match(via.stderr, /refusing to chown/);
  const passwd = spawnSync('stat', ['-c', '%U', '/etc/passwd'], { encoding: 'utf8' });
  assert.equal(passwd.stdout.trim(), 'root');
  fs.rmSync(root, { recursive: true, force: true });
});

test('a non-root start does not chown and does not call gosu', () => {
  assert.notEqual(process.getuid(), 0);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'data-vol-user-'));
  const bin = path.join(root, 'bin');
  const marker = path.join(root, 'marker');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'gosu'), '#!/bin/sh\necho called >&2\nexit 97\n');
  fs.chmodSync(path.join(bin, 'gosu'), 0o755);
  const run = spawnSync('sh', [entryPath, '/bin/sh', '-c', `printf user > ${JSON.stringify(marker)}`], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:/usr/bin:/bin`,
      MESH_DATA_DIR: path.join(root, 'unused'),
    },
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr.includes('called'), false);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'user');
  fs.rmSync(root, { recursive: true, force: true });
});
