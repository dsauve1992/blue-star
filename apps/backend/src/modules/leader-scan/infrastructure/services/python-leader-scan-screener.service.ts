import { Injectable, Logger } from '@nestjs/common';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';
import {
  LeaderScanPayload,
  LeaderScanScreenerService,
} from '../../domain/services/leader-scan-screener.service';

@Injectable()
export class PythonLeaderScanScreenerService
  implements LeaderScanScreenerService
{
  private readonly logger = new Logger(PythonLeaderScanScreenerService.name);
  private readonly runner = new PythonScriptRunner('leader-scan', 'main.py');

  async runScan(): Promise<LeaderScanPayload> {
    let stdout: string;
    let stderr: string;

    try {
      const result = await this.runner.run(['--format=json', '--quiet'], {
        timeoutMs: 600000,
        maxBufferBytes: 20 * 1024 * 1024,
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: unknown) {
      if (!(execError instanceof PythonScriptError)) throw execError;
      this.logger.error(
        `Leader scan execution failed: ${execError.message}; stderr=${execError.stderr.substring(0, 1000)}`,
      );
      if (execError.timedOut) {
        throw new Error('Leader scan timed out after 10 minutes');
      }
      throw new Error(
        `Leader scan failed. Exit code: ${execError.exitCode ?? 'unknown'}. Stderr: ${execError.stderr || '(empty)'}`,
      );
    }

    if (stderr) {
      this.logger.debug(`Leader scan stderr: ${stderr.substring(0, 500)}`);
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
        `Leader scan did not return valid JSON. Output head: ${stdout.substring(0, 200)}`,
      );
    }

    try {
      return JSON.parse(jsonLine) as LeaderScanPayload;
    } catch {
      throw new Error(
        `Failed to parse leader scan JSON. Raw head: ${stdout.substring(0, 500)}`,
      );
    }
  }
}
