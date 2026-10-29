import { Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface PythonScriptRunOptions {
  timeoutMs: number;
  maxBufferBytes: number;
}

export interface PythonScriptOutput {
  stdout: string;
  stderr: string;
}

interface ExecFileFailure extends Error {
  code?: number | string;
  killed?: boolean;
  signal?: string | null;
  stdout?: string;
  stderr?: string;
}

export class PythonScriptError extends Error {
  constructor(
    message: string,
    readonly exitCode: number | null,
    readonly timedOut: boolean,
    readonly stdout: string,
    readonly stderr: string,
  ) {
    super(message);
    this.name = 'PythonScriptError';
  }
}

export class PythonScriptRunner {
  private readonly logger = new Logger(PythonScriptRunner.name);
  private readonly appDirPath: string;
  private readonly scriptPath: string;
  private readonly pythonExecutable: string;

  constructor(appDir: string, script: string) {
    const workspaceRoot = resolve(process.cwd(), '..');
    this.appDirPath = resolve(workspaceRoot, appDir);
    this.scriptPath = join(this.appDirPath, script);

    if (!existsSync(this.scriptPath)) {
      throw new Error(`Python script not found at ${this.scriptPath}`);
    }

    const venvPython = join(this.appDirPath, 'venv', 'bin', 'python3');
    const venvPythonWindows = join(
      this.appDirPath,
      'venv',
      'Scripts',
      'python.exe',
    );

    if (existsSync(venvPython)) {
      this.pythonExecutable = venvPython;
    } else if (existsSync(venvPythonWindows)) {
      this.pythonExecutable = venvPythonWindows;
    } else {
      this.pythonExecutable = 'python3';
      this.logger.warn(
        `Python venv not found at ${venvPython}. Using system python3.`,
      );
    }
  }

  async run(
    args: string[],
    { timeoutMs, maxBufferBytes }: PythonScriptRunOptions,
  ): Promise<PythonScriptOutput> {
    try {
      return await execFileAsync(
        this.pythonExecutable,
        [this.scriptPath, ...args],
        {
          cwd: this.appDirPath,
          timeout: timeoutMs,
          maxBuffer: maxBufferBytes,
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
        },
      );
    } catch (error: unknown) {
      const failure = error as ExecFileFailure;
      throw new PythonScriptError(
        failure.message,
        typeof failure.code === 'number' ? failure.code : null,
        failure.killed === true && failure.signal === 'SIGTERM',
        failure.stdout ?? '',
        failure.stderr ?? '',
      );
    }
  }
}
