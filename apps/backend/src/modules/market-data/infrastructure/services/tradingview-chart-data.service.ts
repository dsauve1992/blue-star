import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { existsSync } from 'node:fs';
import {
  ChartDataService,
  ChartData,
  ChartInterval,
} from '../../domain/services/chart-data.service';
import { PricePoint } from '../../domain/value-objects/price-point';

const execAsync = promisify(exec);

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
  private readonly scriptPath: string;
  private readonly pythonExecutable: string;
  private readonly screenerDir: string;

  constructor() {
    const backendDir = process.cwd();
    const workspaceRoot = resolve(backendDir, '..');
    this.screenerDir = resolve(workspaceRoot, 'screener');
    this.scriptPath = join(this.screenerDir, 'tradingview_chart_service.py');

    if (!existsSync(this.scriptPath)) {
      throw new Error(
        `TradingView chart script not found at ${this.scriptPath}`,
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
        `Python venv not found at ${venvPython}. Using system python3.`,
      );
    }
  }

  async getChartData(
    symbol: string,
    exchange: string,
    interval: ChartInterval,
    bars: number,
    _includeExtendedHours = true,
  ): Promise<ChartData> {
    void _includeExtendedHours;
    const command = `${this.pythonExecutable} ${this.scriptPath} --symbol=${symbol} --exchange=${exchange} --interval=${interval} --bars=${bars}`;

    let stdout: string;
    try {
      const result = await execAsync(command, {
        cwd: this.screenerDir,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });
      stdout = result.stdout;
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string };
      stdout = execError.stdout || '';
      if (!stdout.trim()) {
        throw new Error(
          `TradingView chart data fetch failed: ${execError.stderr || 'unknown error'}`,
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
