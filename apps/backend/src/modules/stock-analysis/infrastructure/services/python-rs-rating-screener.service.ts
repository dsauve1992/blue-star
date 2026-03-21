import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { existsSync } from 'node:fs';
import {
  RsRatingScreenerService,
  RsRatingResult,
} from '../../domain/services/rs-rating-screener.service';

const execAsync = promisify(exec);

interface ExecException extends Error {
  code?: number;
  stdout?: string;
  stderr?: string;
  signal?: string;
}

interface PythonRsRatingItem {
  symbol: string;
  rs_rating: number;
  weighted_score: number;
}

interface PythonResponse {
  ratings: PythonRsRatingItem[];
  count: number;
  computed_at: string;
  error?: string;
}

@Injectable()
export class PythonRsRatingScreenerService implements RsRatingScreenerService {
  private readonly screenerPath: string;
  private readonly pythonExecutable: string;
  private readonly screenerDir: string;

  constructor() {
    const backendDir = process.cwd();
    const workspaceRoot = resolve(backendDir, '..');
    this.screenerDir = resolve(workspaceRoot, 'screener');
    this.screenerPath = join(this.screenerDir, 'rs_rating_service.py');

    if (!existsSync(this.screenerPath)) {
      throw new Error(
        `RS rating script not found at ${this.screenerPath}. Please ensure the screener is set up.`,
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
        `Python virtual environment not found at ${venvPython}. Using system python3.`,
      );
    }

    console.log(
      `RS rating screener configured: ${this.pythonExecutable} ${this.screenerPath}`,
    );
  }

  async fetchRsRatings(): Promise<RsRatingResult[]> {
    try {
      const command = `${this.pythonExecutable} ${this.screenerPath} --format=json --quiet`;

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

        console.error('RS rating screener execution failed:', {
          command,
          errorCode: error.code,
          stderr: stderr.substring(0, 1000),
          message: error.message,
        });

        if (!stdout || !stdout.trim()) {
          throw new Error(
            `RS rating screener failed. Exit code: ${error.code || 'unknown'}. Stderr: ${stderr || '(empty)'}`,
          );
        }
      }

      if (stderr) {
        console.warn('RS rating screener stderr:', stderr);
      }

      const stdoutLines = stdout.trim().split('\n');
      const jsonLine = stdoutLines.find((line) => {
        const trimmed = line.trim();
        return trimmed.startsWith('{') && trimmed.endsWith('}');
      });

      if (!jsonLine) {
        throw new Error(
          `RS rating screener did not return valid JSON. Output: ${stdout.substring(0, 200)}`,
        );
      }

      let result: PythonResponse;
      try {
        result = JSON.parse(jsonLine) as PythonResponse;
      } catch {
        throw new Error(
          `Failed to parse RS rating JSON output. Raw output: ${stdout.substring(0, 500)}`,
        );
      }

      if (result.error) {
        throw new Error(`RS rating screener error: ${result.error}`);
      }

      return result.ratings.map((item) => ({
        symbol: item.symbol,
        rsRating: item.rs_rating,
        weightedScore: item.weighted_score,
      }));
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('RS rating screener execution timed out');
      }

      throw new Error(`Failed to execute RS rating screener: ${error}`);
    }
  }
}
