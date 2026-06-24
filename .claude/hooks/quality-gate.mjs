#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..', '..');

function read(stream) {
  return new Promise((res) => {
    let data = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => (data += chunk));
    stream.on('end', () => res(data));
    stream.on('error', () => res(''));
  });
}

function git(args) {
  const r = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : '';
}

function changedFiles() {
  const out = new Set();
  for (const line of git(['diff', '--name-only', 'HEAD']).split('\n')) {
    if (line.trim()) out.add(line.trim());
  }
  for (const line of git(['ls-files', '--others', '--exclude-standard']).split('\n')) {
    if (line.trim()) out.add(line.trim());
  }
  return [...out];
}

const WORKSPACES = {
  backend: {
    dir: 'apps/backend',
    typecheck: ['npx', ['tsc', '--noEmit']],
    lint: ['npx', ['eslint', '{src,apps,libs,test}/**/*.ts']],
  },
  frontend: {
    dir: 'apps/frontend',
    typecheck: ['npx', ['tsc', '-b', '--noEmit']],
    lint: ['npx', ['eslint', '.']],
  },
};

const raw = await read(process.stdin);
try {
  const input = JSON.parse(raw);
  if (input?.stop_hook_active) process.exit(0);
} catch {
  // proceed even without parseable input
}

const touched = changedFiles();
const active = Object.values(WORKSPACES).filter((w) =>
  touched.some((f) => f.startsWith(w.dir + '/')),
);

if (active.length === 0) process.exit(0);

const failures = [];

for (const ws of active) {
  const cwd = resolve(REPO_ROOT, ws.dir);

  const [tcBin, tcArgs] = ws.typecheck;
  const tc = spawnSync(tcBin, tcArgs, { cwd, encoding: 'utf8' });
  if (tc.status !== 0) {
    const out = `${tc.stdout ?? ''}${tc.stderr ?? ''}`.trim();
    failures.push(`[${ws.dir}] type-check failed:\n${out}`);
  }

  const [ltBin, ltArgs] = ws.lint;
  const lt = spawnSync(ltBin, ltArgs, { cwd, encoding: 'utf8' });
  if (lt.status !== 0) {
    const out = `${lt.stdout ?? ''}${lt.stderr ?? ''}`.trim();
    failures.push(`[${ws.dir}] lint failed:\n${out}`);
  }
}

if (failures.length === 0) process.exit(0);

const message = [
  'Quality gate failed on workspaces you changed this turn. Fix these before finishing:',
  '',
  ...failures,
].join('\n');

console.log(
  JSON.stringify({
    decision: 'block',
    reason: message,
  }),
);
process.exit(0);
