import { Injectable, Logger } from '@nestjs/common';
import { ConsolidationScreenerService } from '../../domain/services/consolidation-screener.service';
import { ConsolidationResult } from '../../domain/value-objects/consolidation-result';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';

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
  private readonly logger = new Logger(PythonConsolidationScreenerService.name);
  private readonly runner = new PythonScriptRunner('screener', 'main.py');

  async analyzeConsolidations(options: { type: 'daily' | 'weekly' }): Promise<{
    daily: ConsolidationResult[];
    weekly: ConsolidationResult[];
  }> {
    const type = options.type;

    try {
      let stdout: string;

      try {
        ({ stdout } = await this.runner.run(
          ['--format=json', `--type=${type}`, '--quiet'],
          { timeoutMs: 600000, maxBufferBytes: 10 * 1024 * 1024 },
        ));
      } catch (error: unknown) {
        if (!(error instanceof PythonScriptError) || error.timedOut) {
          throw error;
        }
        stdout = error.stdout;

        this.logger.error('Python screener execution failed', {
          errorCode: error.exitCode,
          stderr: error.stderr.substring(0, 1000),
          message: error.message,
        });

        if (!stdout.trim()) {
          const errorDetails = [
            `Exit code: ${error.exitCode ?? 'unknown'}`,
            `Stdout: ${stdout || '(empty)'}`,
            `Stderr: ${error.stderr || '(empty)'}`,
            `Error message: ${error.message || 'No message'}`,
          ].join('\n');

          throw new Error(
            `Python screener failed to execute.\n${errorDetails}`,
          );
        }
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
      if (error instanceof PythonScriptError && error.timedOut) {
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
