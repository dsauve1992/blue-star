import { Injectable, Logger } from '@nestjs/common';
import {
  RawStockClassification,
  StockClassifierService,
} from '../../domain/services/stock-classifier.service';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';

interface ClassifierJsonResponse {
  ticker: string;
  sector: string;
  industry: string;
  industryKey: string;
}

@Injectable()
export class PythonStockClassifierService implements StockClassifierService {
  private readonly logger = new Logger(PythonStockClassifierService.name);
  private readonly runner = new PythonScriptRunner('screener', 'classifier.py');

  async classify(ticker: string): Promise<RawStockClassification> {
    const safeTicker = ticker.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,15}$/.test(safeTicker)) {
      throw new Error(`Invalid ticker for classifier: ${ticker}`);
    }

    let stdout: string;
    try {
      const result = await this.runner.run([safeTicker], {
        timeoutMs: 30000,
        maxBufferBytes: 1024 * 1024,
      });
      stdout = result.stdout;
    } catch (execError: unknown) {
      if (!(execError instanceof PythonScriptError)) throw execError;
      this.logger.error(
        `Classifier exec failed for ${safeTicker}: ${execError.message}; stderr=${execError.stderr}`,
      );
      throw new Error(
        `Python classifier failed for ${safeTicker}: ${execError.message}`,
      );
    }

    const trimmed = stdout.trim();
    let parsed: ClassifierJsonResponse;
    try {
      parsed = JSON.parse(trimmed) as ClassifierJsonResponse;
    } catch {
      throw new Error(
        `Classifier returned invalid JSON for ${safeTicker}: ${trimmed.substring(0, 200)}`,
      );
    }

    return {
      ticker: parsed.ticker,
      sector: parsed.sector,
      industry: parsed.industry,
      industryKey: parsed.industryKey,
    };
  }
}
