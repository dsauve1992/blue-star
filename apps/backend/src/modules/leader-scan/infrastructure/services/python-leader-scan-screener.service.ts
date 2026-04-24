import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { existsSync } from 'node:fs';
import {
  LeaderScanPayload,
  LeaderScanScreenerService,
} from '../../domain/services/leader-scan-screener.service';

const execAsync = promisify(exec);

interface ExecException extends Error {
  code?: number;
  stdout?: string;
  stderr?: string;
}

@Injectable()
export class PythonLeaderScanScreenerService
  implements LeaderScanScreenerService
{
  private readonly logger = new Logger(PythonLeaderScanScreenerService.name);
  private readonly scriptPath: string;
  private readonly scriptDir: string;
  private readonly pythonExecutable: string;

  constructor() {
    const backendDir = process.cwd();
    const workspaceRoot = resolve(backendDir, '..');
    this.scriptDir = resolve(workspaceRoot, 'leader-scan');
    this.scriptPath = join(this.scriptDir, 'main.py');

    if (!existsSync(this.scriptPath)) {
      throw new Error(
        `Leader scan script not found at ${this.scriptPath}. Run apps/leader-scan/setup.sh first.`,
      );
    }

    const venvPython = join(this.scriptDir, 'venv', 'bin', 'python3');
    const venvPythonWindows = join(
      this.scriptDir,
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
        `Python virtual environment not found at ${venvPython}. Using system python3.`,
      );
    }

    this.logger.log(
      `Leader scan configured: ${this.pythonExecutable} ${this.scriptPath}`,
    );
  }

  async runScan(): Promise<LeaderScanPayload> {
    const command = `${this.pythonExecutable} ${this.scriptPath} --format=json --quiet`;

    let stdout: string;
    let stderr: string;

    try {
      const result = await execAsync(command, {
        cwd: this.scriptDir,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 600000,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: unknown) {
      const error = execError as ExecException;
      stdout = error.stdout ?? '';
      stderr = error.stderr ?? '';

      this.logger.error('Leader scan execution failed', {
        errorCode: error.code,
        stderr: stderr.substring(0, 1000),
        message: error.message,
      });

      if (!stdout.trim()) {
        throw new Error(
          `Leader scan failed. Exit code: ${error.code ?? 'unknown'}. Stderr: ${stderr || '(empty)'}`,
        );
      }
    }

    if (stderr) {
      this.logger.debug(`Leader scan stderr: ${stderr.substring(0, 500)}`);
    }

    const jsonLine = stdout
      .trim()
      .split('\n')
      .find((line) => {
        const trimmed = line.trim();
        return trimmed.startsWith('{') && trimmed.endsWith('}');
      });

    if (!jsonLine) {
      throw new Error(
        `Leader scan did not return valid JSON. Output head: ${stdout.substring(0, 200)}`,
      );
    }

    try {
      return JSON.parse(jsonLine) as LeaderScanPayload;
    } catch {
      throw new Error(
        `Failed to parse leader scan JSON. Raw head: ${stdout.substring(0, 500)}`,
      );
    }
  }
}
