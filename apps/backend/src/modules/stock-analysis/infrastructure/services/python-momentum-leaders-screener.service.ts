import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { existsSync } from 'node:fs';
import {
  MomentumLeadersScan,
  MomentumLeadersScreenerService,
} from '../../domain/services/momentum-leaders-screener.service';

const execAsync = promisify(exec);

interface ExecException extends Error {
  code?: number;
  stdout?: string;
  stderr?: string;
}

interface PythonLeader {
  symbol: string;
  exchange: string;
  sector: string;
  perf_1m: number;
  perf_3m: number;
  perf_6m: number;
  rank_1m: number;
  rank_3m: number;
  rank_6m: number;
  rs_score: number;
  top_1m: boolean;
  top_3m: boolean;
  top_6m: boolean;
}

interface PythonResponse {
  scan_date: string;
  universe_size: number;
  leader_count: number;
  leaders: PythonLeader[];
  error?: string;
}

@Injectable()
export class PythonMomentumLeadersScreenerService
  implements MomentumLeadersScreenerService
{
  private readonly logger = new Logger(
    PythonMomentumLeadersScreenerService.name,
  );
  private readonly scriptPath: string;
  private readonly screenerDir: string;
  private readonly pythonExecutable: string;

  constructor() {
    const workspaceRoot = resolve(process.cwd(), '..');
    this.screenerDir = resolve(workspaceRoot, 'screener');
    this.scriptPath = join(this.screenerDir, 'momentum_leaders_service.py');

    if (!existsSync(this.scriptPath)) {
      throw new Error(
        `Momentum leaders script not found at ${this.scriptPath}. Please ensure the screener is set up.`,
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
      this.logger.warn(
        `Python virtual environment not found at ${venvPython}. Using system python3.`,
      );
    }
  }

  async fetchMomentumLeaders(): Promise<MomentumLeadersScan> {
    const command = `${this.pythonExecutable} ${this.scriptPath} --format=json --quiet`;

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
      stdout = error.stdout ?? '';
      stderr = error.stderr ?? '';

      this.logger.error('Momentum leaders screener execution failed', {
        errorCode: error.code,
        stderr: stderr.substring(0, 1000),
        message: error.message,
      });

      if (!stdout.trim()) {
        throw new Error(
          `Momentum leaders screener failed. Exit code: ${error.code ?? 'unknown'}. Stderr: ${stderr || '(empty)'}`,
        );
      }
    }

    if (stderr) {
      this.logger.debug(
        `Momentum leaders screener stderr: ${stderr.substring(0, 500)}`,
      );
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
        `Momentum leaders screener did not return valid JSON. Output: ${stdout.substring(0, 200)}`,
      );
    }

    let result: PythonResponse;
    try {
      result = JSON.parse(jsonLine) as PythonResponse;
    } catch {
      throw new Error(
        `Failed to parse momentum leaders JSON output. Raw output: ${stdout.substring(0, 500)}`,
      );
    }

    if (result.error) {
      throw new Error(`Momentum leaders screener error: ${result.error}`);
    }

    return {
      scanDate: result.scan_date,
      universeSize: result.universe_size,
      leaders: result.leaders.map((item) => ({
        symbol: item.symbol,
        exchange: item.exchange,
        sector: item.sector || null,
        perf1M: item.perf_1m,
        perf3M: item.perf_3m,
        perf6M: item.perf_6m,
        rank1M: item.rank_1m,
        rank3M: item.rank_3m,
        rank6M: item.rank_6m,
        rsScore: item.rs_score,
        top1M: item.top_1m,
        top3M: item.top_3m,
        top6M: item.top_6m,
      })),
    };
  }
}
