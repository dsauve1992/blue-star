import { Injectable, Logger } from '@nestjs/common';
import {
  PotentScreenerResult,
  PotentScreenerService,
} from '../../domain/services/potent-screener.service';
import {
  PotentScanHit,
  Tier,
} from '../../domain/value-objects/potent-scan-stock';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';

interface PythonHit {
  symbol: string;
  exchange: string;
  change: number;
  close: number | null;
  adr_pct: number | null;
  relative_volume_10d_calc: number | null;
  market_cap_basic: number | null;
  sector: string;
  industry: string;
  EMA9: number | null;
  EMA21: number | null;
  EMA50: number | null;
  tier: Tier | null;
}

interface PythonNearMiss extends PythonHit {
  value_traded: number | null;
  avg_value_traded_30d: number | null;
}

interface PythonResponse {
  universe_size: number;
  hits: PythonHit[];
  near_misses: PythonNearMiss[];
  error?: string;
}

@Injectable()
export class PythonPotentScreenerService implements PotentScreenerService {
  private readonly logger = new Logger(PythonPotentScreenerService.name);
  private readonly runner = new PythonScriptRunner(
    'screener',
    'potent_scan_service.py',
  );

  async scan(): Promise<PotentScreenerResult> {
    let stdout: string;

    try {
      ({ stdout } = await this.runner.run(['--quiet'], {
        timeoutMs: 600000,
        maxBufferBytes: 10 * 1024 * 1024,
      }));
    } catch (error: unknown) {
      if (!(error instanceof PythonScriptError)) throw error;
      if (error.timedOut) {
        throw new Error('Potent scan screener execution timed out');
      }
      stdout = error.stdout;

      this.logger.error('Potent scan screener execution failed', {
        errorCode: error.exitCode,
        stderr: error.stderr.substring(0, 1000),
        message: error.message,
      });

      if (!stdout.trim()) {
        throw new Error(
          `Potent scan screener failed. Exit code: ${error.exitCode ?? 'unknown'}. Stderr: ${error.stderr || '(empty)'}`,
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
        `Potent scan screener did not return valid JSON. Output: ${stdout.substring(0, 200)}`,
      );
    }

    let result: PythonResponse;
    try {
      result = JSON.parse(jsonLine) as PythonResponse;
    } catch {
      throw new Error(
        `Failed to parse potent scan JSON output. Raw output: ${stdout.substring(0, 500)}`,
      );
    }

    if (result.error) {
      throw new Error(`Potent scan screener error: ${result.error}`);
    }

    return {
      universeSize: result.universe_size,
      hits: result.hits.map(toHit),
      nearMisses: result.near_misses.map((item) => ({
        ...toHit(item),
        valueTraded: item.value_traded,
        avgValueTraded30d: item.avg_value_traded_30d,
      })),
    };
  }
}

function toHit(item: PythonHit): PotentScanHit {
  return {
    symbol: item.symbol,
    exchange: item.exchange,
    changePct: item.change,
    close: item.close,
    adrPct: item.adr_pct,
    relativeVolume: item.relative_volume_10d_calc,
    marketCap: item.market_cap_basic,
    sector: item.sector,
    industry: item.industry,
    ema9: item.EMA9,
    ema21: item.EMA21,
    ema50: item.EMA50,
    tier: item.tier,
  };
}
