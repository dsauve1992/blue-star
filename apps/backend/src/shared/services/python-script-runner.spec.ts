import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PythonScriptError, PythonScriptRunner } from './python-script-runner';

const OPTIONS = { timeoutMs: 10000, maxBufferBytes: 1024 * 1024 };

describe('PythonScriptRunner', () => {
  let appDir: string;

  beforeEach(() => {
    appDir = mkdtempSync(join(tmpdir(), 'python-runner-'));
  });

  afterEach(() => {
    rmSync(appDir, { recursive: true, force: true });
  });

  function runnerFor(source: string): PythonScriptRunner {
    writeFileSync(join(appDir, 'script.py'), source);
    return new PythonScriptRunner(appDir, 'script.py');
  }

  it('throws at construction when the script is missing', () => {
    expect(() => new PythonScriptRunner(appDir, 'missing.py')).toThrow(
      /Python script not found/,
    );
  });

  it('passes a shell-metacharacter argument as one literal argv entry', async () => {
    const pwned = join(appDir, 'pwned');
    const runner = runnerFor(
      'import json, sys\nprint(json.dumps(sys.argv[1:]))',
    );
    const argument = `AAPL; touch ${pwned}`;

    const { stdout } = await runner.run([argument, '--bars=5'], OPTIONS);

    expect(JSON.parse(stdout)).toEqual([argument, '--bars=5']);
    expect(existsSync(pwned)).toBe(false);
  });

  it('reports a timeout', async () => {
    const runner = runnerFor('import time\ntime.sleep(30)');

    const error = await runner
      .run([], { ...OPTIONS, timeoutMs: 300 })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PythonScriptError);
    expect((error as PythonScriptError).timedOut).toBe(true);
  });

  it('carries exit code, stdout and stderr on a non-zero exit', async () => {
    const runner = runnerFor(
      'import sys\nprint("partial")\nprint("boom", file=sys.stderr)\nsys.exit(3)',
    );

    const error = await runner.run([], OPTIONS).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PythonScriptError);
    const scriptError = error as PythonScriptError;
    expect(scriptError.exitCode).toBe(3);
    expect(scriptError.timedOut).toBe(false);
    expect(scriptError.stdout.trim()).toBe('partial');
    expect(scriptError.stderr.trim()).toBe('boom');
  });
});
