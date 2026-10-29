import { Injectable } from '@nestjs/common';
import {
  ChartDataService,
  ChartData,
  ChartInterval,
} from '../../domain/services/chart-data.service';
import { PricePoint } from '../../domain/value-objects/price-point';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';

interface PythonCandle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PythonChartResponse {
  symbol: string;
  exchange: string;
  interval: string;
  candles: PythonCandle[];
  error?: string;
}

@Injectable()
export class TradingViewChartDataService implements ChartDataService {
  private readonly runner = new PythonScriptRunner(
    'screener',
    'tradingview_chart_service.py',
  );

  async getChartData(
    symbol: string,
    exchange: string,
    interval: ChartInterval,
    bars: number,
    _includeExtendedHours = true,
  ): Promise<ChartData> {
    void _includeExtendedHours;
    let stdout: string;
    try {
      const result = await this.runner.run(
        [
          `--symbol=${symbol}`,
          `--exchange=${exchange}`,
          `--interval=${interval}`,
          `--bars=${bars}`,
        ],
        { timeoutMs: 30000, maxBufferBytes: 10 * 1024 * 1024 },
      );
      stdout = result.stdout;
    } catch (error: unknown) {
      if (!(error instanceof PythonScriptError)) throw error;
      stdout = error.stdout;
      if (!stdout.trim()) {
        throw new Error(
          `TradingView chart data fetch failed: ${error.stderr || 'unknown error'}`,
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
        `TradingView chart script did not return valid JSON: ${stdout.substring(0, 200)}`,
      );
    }

    const parsed: PythonChartResponse = JSON.parse(
      jsonLine,
    ) as PythonChartResponse;

    if (parsed.error) {
      throw new Error(`TradingView chart error: ${parsed.error}`);
    }

    const pricePoints = parsed.candles.map((candle) => {
      const date =
        typeof candle.time === 'string'
          ? new Date(candle.time + 'T00:00:00Z')
          : new Date(candle.time * 1000);

      return PricePoint.of(
        date,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
      );
    });

    return {
      symbol: parsed.symbol,
      exchange: parsed.exchange,
      interval,
      pricePoints,
    };
  }
}
