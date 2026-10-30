import { Injectable, Logger } from '@nestjs/common';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';

interface ThemeExtractorResponse {
  theme: string;
  tickers: string[];
}

@Injectable()
export class PythonThemeExtractorService {
  private readonly logger = new Logger(PythonThemeExtractorService.name);
  private readonly runner = new PythonScriptRunner(
    'theme_extractor',
    'main.py',
  );
  private readonly timeoutMs = 600_000;

  async extractThemes(): Promise<ThemeExtractorResponse[]> {
    let stdout: string;
    let stderr: string;

    try {
      const result = await this.runner.run([], {
        timeoutMs: this.timeoutMs,
        maxBufferBytes: 10 * 1024 * 1024,
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: unknown) {
      if (!(execError instanceof PythonScriptError)) throw execError;

      if (execError.timedOut) {
        throw new Error(
          `Python theme extractor timed out after ${this.timeoutMs / 1000}s`,
        );
      }

      stdout = execError.stdout;
      stderr = execError.stderr;

      this.logger.error(
        `Theme extractor exec failed: ${execError.message}; stderr=${stderr.substring(0, 1000)}`,
      );

      if (!stdout.trim()) {
        throw new Error(
          `Python theme extractor failed: ${execError.message}; stderr=${stderr.substring(0, 1000)}`,
        );
      }
    }

    if (stderr && !stderr.includes('Found') && !stderr.includes('Processing')) {
      this.logger.warn(`Python theme extractor stderr: ${stderr}`);
    }

    const stdoutTrimmed = stdout.trim();
    const firstBracketIndex = stdoutTrimmed.indexOf('[');
    const lastBracketIndex = stdoutTrimmed.lastIndexOf(']');

    if (
      firstBracketIndex === -1 ||
      lastBracketIndex === -1 ||
      lastBracketIndex <= firstBracketIndex
    ) {
      const errorMessage =
        stdoutTrimmed
          .split('\n')
          .find((line) => line.toLowerCase().includes('error')) ||
        stdoutTrimmed.substring(0, 200);
      throw new Error(
        `Python theme extractor did not return valid JSON. Output: ${errorMessage}`,
      );
    }

    const jsonString = stdoutTrimmed.substring(
      firstBracketIndex,
      lastBracketIndex + 1,
    );

    let result: ThemeExtractorResponse[];
    try {
      result = JSON.parse(jsonString) as ThemeExtractorResponse[];
    } catch (parseError) {
      throw new Error(
        `Failed to parse Python theme extractor JSON output. Error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. Raw output: ${jsonString.substring(0, 500)}`,
      );
    }

    return result;
  }
}
