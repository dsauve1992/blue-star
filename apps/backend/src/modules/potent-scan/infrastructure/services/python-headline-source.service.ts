import { Injectable, Logger } from '@nestjs/common';
import { HeadlineSource } from '../../domain/services/hit-researcher.service';
import { HitHeadlines } from '../../domain/value-objects/hit-research';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';

interface PythonHeadline {
  title: string;
  publisher: string | null;
  url: string;
  published_at: string | null;
}

interface PythonResponse {
  headlines: Record<string, { items: PythonHeadline[]; error: string | null }>;
}

@Injectable()
export class PythonHeadlineSource implements HeadlineSource {
  private readonly logger = new Logger(PythonHeadlineSource.name);
  private readonly runner = new PythonScriptRunner(
    'screener',
    'potent_headlines_service.py',
  );

  async fetch(symbols: string[]): Promise<HitHeadlines[]> {
    let stdout: string;
    try {
      ({ stdout } = await this.runner.run(['--tickers', symbols.join(',')], {
        timeoutMs: 300000,
        maxBufferBytes: 10 * 1024 * 1024,
      }));
    } catch (error: unknown) {
      if (!(error instanceof PythonScriptError)) throw error;
      throw new Error(
        `Headline fetch failed${error.timedOut ? ' (timed out)' : ''}. Exit code: ${error.exitCode ?? 'unknown'}. Stderr: ${error.stderr.substring(0, 500) || '(empty)'}`,
      );
    }

    const jsonLine = stdout
      .trim()
      .split('\n')
      .find((line) => line.trim().startsWith('{'));
    if (!jsonLine) {
      throw new Error(
        `Headline fetch returned no JSON. Output: ${stdout.substring(0, 200)}`,
      );
    }

    let result: PythonResponse;
    try {
      result = JSON.parse(jsonLine) as PythonResponse;
    } catch {
      throw new Error(
        `Headline fetch returned invalid JSON. Output: ${stdout.substring(0, 200)}`,
      );
    }
    const headlines = symbols.map((symbol) => {
      const entry = result.headlines[symbol];
      return {
        symbol,
        headlines: (entry?.items ?? []).map((item) => ({
          title: item.title,
          publisher: item.publisher,
          url: item.url,
          publishedAt: item.published_at,
        })),
        fetchError: entry ? entry.error : 'Missing from headline output',
      };
    });

    const failed = headlines.filter((h) => h.fetchError !== null);
    if (failed.length > 0) {
      this.logger.warn(
        `Headline fetch failed for ${failed.length}/${symbols.length} tickers: ${failed
          .map((h) => `${h.symbol} (${h.fetchError})`)
          .join(', ')
          .substring(0, 1000)}`,
      );
    }
    return headlines;
  }
}
