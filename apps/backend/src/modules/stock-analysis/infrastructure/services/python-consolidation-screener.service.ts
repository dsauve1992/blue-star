import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { existsSync } from 'node:fs';
import { ConsolidationScreenerService } from '../../domain/services/consolidation-screener.service';
import { ConsolidationResult } from '../../domain/value-objects/consolidation-result';

const execAsync = promisify(exec);

interface ExecException extends Error {
  code?: number;
  stdout?: string;
  stderr?: string;
  signal?: string;
}

interface PythonConsolidationItem {
  symbol: string;
  is_new: boolean;
  ticker_full_name: string;
  sector?: string;
  industry?: string;
}

interface PythonResponse {
  daily: PythonConsolidationItem[];
  weekly: PythonConsolidationItem[];
  dailyCount: number;
  weeklyCount: number;
  error?: string;
}

@Injectable()
export class PythonConsolidationScreenerService
  implements ConsolidationScreenerService
{
  private readonly screenerPath: string;
  private readonly pythonExecutable: string;
  private readonly screenerDir: string;

  constructor() {
    const backendDir = process.cwd();
    const workspaceRoot = resolve(backendDir, '..');
    this.screenerDir = resolve(workspaceRoot, 'screener');
    this.screenerPath = join(this.screenerDir, 'main.py');

    if (!existsSync(this.screenerPath)) {
      throw new Error(
        `Python screener script not found at ${this.screenerPath}. Please ensure the screener is set up.`,
      );
    }

    const venvPython = join(this.screenerDir, 'venv', 'bin', 'python3');
    const venvPythonWindows = join(
      this.screenerDir,
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
      console.warn(
        `Python virtual environment not found at ${venvPython}. Using system python3. Make sure dependencies are installed.`,
      );
    }

    console.log(
      `Python screener configured: ${this.pythonExecutable} ${this.screenerPath}`,
    );
  }

  async analyzeConsolidations(options: { type: 'daily' | 'weekly' }): Promise<{
    daily: ConsolidationResult[];
    weekly: ConsolidationResult[];
  }> {
    const type = options.type;

    try {
      const command = `${this.pythonExecutable} ${this.screenerPath} --format=json --type=${type} --quiet`;

      let stdout: string;
      let stderr: string;

      try {
        const result = await execAsync(command, {
          cwd: this.screenerDir,
          maxBuffer: 10 * 1024 * 1024,
          timeout: 600000,
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
        });
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (execError: unknown) {
        const error = execError as ExecException;

        stdout = error.stdout || '';
        stderr = error.stderr || '';

        const errorCode = error.code;
        const errorSignal = error.signal;

        const errorInfo = {
          command,
          cwd: this.screenerDir,
          pythonExecutable: this.pythonExecutable,
          screenerPath: this.screenerPath,
          errorCode,
          errorSignal,
          stdout: stdout.substring(0, 1000),
          stderr: stderr.substring(0, 1000),
          message: error.message,
          fullError: JSON.stringify(error),
        };

        console.error(
          'Python screener execution failed:',
          JSON.stringify(errorInfo, null, 2),
        );

        if (!stdout || !stdout.trim()) {
          const errorDetails = [
            `Command: ${command}`,
            `Working directory: ${this.screenerDir}`,
            `Python executable: ${this.pythonExecutable}`,
            `Exit code: ${errorCode || 'unknown'}`,
            `Signal: ${errorSignal || 'none'}`,
            `Stdout: ${stdout || '(empty)'}`,
            `Stderr: ${stderr || '(empty)'}`,
            `Error message: ${error.message || 'No message'}`,
          ].join('\n');

          throw new Error(
            `Python screener failed to execute.\n${errorDetails}`,
          );
        }
      }

      if (stderr && !stderr.includes('Found')) {
        console.warn('Python screener stderr:', stderr);
      }

      const stdoutLines = stdout.trim().split('\n');
      const jsonLine = stdoutLines.find((line) => {
        const trimmed = line.trim();
        return trimmed.startsWith('{') && trimmed.endsWith('}');
      });

      if (!jsonLine) {
        const errorMessage =
          stdoutLines.find((line) => line.toLowerCase().includes('error')) ||
          stdout.trim();
        throw new Error(
          `Python screener did not return valid JSON. Output: ${errorMessage.substring(0, 200)}`,
        );
      }

      let result: PythonResponse;
      try {
        result = JSON.parse(jsonLine) as PythonResponse;
      } catch {
        throw new Error(
          `Failed to parse Python screener JSON output. Raw output: ${stdout.substring(0, 500)}`,
        );
      }

      if (result.error) {
        throw new Error(`Python screener error: ${result.error}`);
      }

      return {
        daily: result.daily.map((item) =>
          ConsolidationResult.of({
            symbol: item.symbol,
            isNew: item.is_new,
            tickerFullName: item.ticker_full_name,
            timeframe: 'daily',
            sector: item.sector,
            industry: item.industry,
          }),
        ),
        weekly: result.weekly.map((item) =>
          ConsolidationResult.of({
            symbol: item.symbol,
            isNew: item.is_new,
            tickerFullName: item.ticker_full_name,
            timeframe: 'weekly',
            sector: item.sector,
            industry: item.industry,
          }),
        ),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Python screener execution timed out');
      }

      if (error instanceof SyntaxError) {
        throw new Error(
          `Failed to parse Python screener output: ${error.message}`,
        );
      }

      throw new Error(`Failed to execute Python screener: ${error}`);
    }
  }
}
