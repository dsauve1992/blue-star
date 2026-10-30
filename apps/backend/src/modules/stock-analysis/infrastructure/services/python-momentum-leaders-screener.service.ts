import { Injectable, Logger } from '@nestjs/common';
import {
  MomentumLeadersScan,
  MomentumLeadersScreenerService,
} from '../../domain/services/momentum-leaders-screener.service';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';

interface PythonLeader {
  symbol: string;
  exchange: string;
  sector: string;
  perf_1m: number;
  perf_3m: number;
  perf_6m: number;
  adr_pct: number;
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
  private readonly runner = new PythonScriptRunner(
    'screener',
    'momentum_leaders_service.py',
  );

  async fetchMomentumLeaders(): Promise<MomentumLeadersScan> {
    let stdout: string;

    try {
      ({ stdout } = await this.runner.run(['--format=json', '--quiet'], {
        timeoutMs: 600000,
        maxBufferBytes: 10 * 1024 * 1024,
      }));
    } catch (error: unknown) {
      if (!(error instanceof PythonScriptError)) throw error;
      if (error.timedOut) {
        throw new Error('Momentum leaders screener execution timed out');
      }
      stdout = error.stdout;

      this.logger.error('Momentum leaders screener execution failed', {
        errorCode: error.exitCode,
        stderr: error.stderr.substring(0, 1000),
        message: error.message,
      });

      if (!stdout.trim()) {
        throw new Error(
          `Momentum leaders screener failed. Exit code: ${error.exitCode ?? 'unknown'}. Stderr: ${error.stderr || '(empty)'}`,
        );
      }
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
        adrPct: item.adr_pct,
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
