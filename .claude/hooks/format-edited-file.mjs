#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

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

function workspaceFor(filePath) {
  const rel = relative(REPO_ROOT, filePath);
  if (rel.startsWith('apps/backend/')) return resolve(REPO_ROOT, 'apps/backend');
  if (rel.startsWith('apps/frontend/')) return resolve(REPO_ROOT, 'apps/frontend');
  return null;
}

function run(bin, args, cwd) {
  return spawnSync('npx', [bin, ...args], { cwd, encoding: 'utf8' });
}

const raw = await read(process.stdin);
let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

const abs = resolve(filePath);
if (!abs.startsWith(REPO_ROOT)) process.exit(0);
if (!/\.(ts|tsx|md)$/.test(abs)) process.exit(0);

const prettier = run('prettier', ['--write', '--log-level', 'silent', abs], REPO_ROOT);
if (prettier.status !== 0 && prettier.stderr) {
  process.stderr.write(`prettier: ${prettier.stderr.trim()}\n`);
}

if (/\.(ts|tsx)$/.test(abs)) {
  const ws = workspaceFor(abs);
  if (ws) {
    const eslint = run('eslint', ['--fix', '--no-warn-ignored', abs], ws);
    if (eslint.status !== 0 && eslint.stdout) {
      process.stderr.write(`eslint: ${eslint.stdout.trim()}\n`);
    }
  }
}

process.exit(0);
