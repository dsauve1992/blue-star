import { Injectable, Logger } from '@nestjs/common';
import {
  RsRatingScreenerService,
  RsRatingResult,
} from '../../domain/services/rs-rating-screener.service';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';

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
  private readonly logger = new Logger(PythonRsRatingScreenerService.name);
  private readonly runner = new PythonScriptRunner(
    'screener',
    'rs_rating_service.py',
  );

  async fetchRsRatings(): Promise<RsRatingResult[]> {
    try {
      let stdout: string;

      try {
        ({ stdout } = await this.runner.run(['--format=json', '--quiet'], {
          timeoutMs: 600000,
          maxBufferBytes: 10 * 1024 * 1024,
        }));
      } catch (error: unknown) {
        if (!(error instanceof PythonScriptError) || error.timedOut) {
          throw error;
        }
        stdout = error.stdout;

        this.logger.error('RS rating screener execution failed', {
          errorCode: error.exitCode,
          stderr: error.stderr.substring(0, 1000),
          message: error.message,
        });

        if (!stdout.trim()) {
          throw new Error(
            `RS rating screener failed. Exit code: ${error.exitCode ?? 'unknown'}. Stderr: ${error.stderr || '(empty)'}`,
          );
        }
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
      if (error instanceof PythonScriptError && error.timedOut) {
        throw new Error('RS rating screener execution timed out');
      }

      throw new Error(`Failed to execute RS rating screener: ${error}`);
    }
  }
}
