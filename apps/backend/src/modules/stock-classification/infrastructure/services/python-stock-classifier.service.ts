import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { existsSync } from 'node:fs';
import {
  RawStockClassification,
  StockClassifierService,
} from '../../domain/services/stock-classifier.service';

const execAsync = promisify(exec);

interface ExecException extends Error {
  code?: number;
  stdout?: string;
  stderr?: string;
}

interface ClassifierJsonResponse {
  ticker: string;
  sector: string;
  industry: string;
  industryKey: string;
}

@Injectable()
export class PythonStockClassifierService implements StockClassifierService {
  private readonly logger = new Logger(PythonStockClassifierService.name);
  private readonly classifierPath: string;
  private readonly classifierDir: string;
  private readonly pythonExecutable: string;

  constructor() {
    const backendDir = process.cwd();
    const workspaceRoot = resolve(backendDir, '..');
    this.classifierDir = resolve(workspaceRoot, 'screener');
    this.classifierPath = join(this.classifierDir, 'classifier.py');

    if (!existsSync(this.classifierPath)) {
      throw new Error(
        `Python classifier script not found at ${this.classifierPath}. Please ensure the screener venv is set up.`,
      );
    }

    const venvPython = join(this.classifierDir, 'venv', 'bin', 'python3');
    const venvPythonWindows = join(
      this.classifierDir,
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
      this.logger.warn(
        `Python venv not found at ${venvPython}. Using system python3.`,
      );
    }
  }

  async classify(ticker: string): Promise<RawStockClassification> {
    const safeTicker = ticker.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,15}$/.test(safeTicker)) {
      throw new Error(`Invalid ticker for classifier: ${ticker}`);
    }

    const command = `${this.pythonExecutable} ${this.classifierPath} ${safeTicker}`;

    let stdout: string;
    try {
      const result = await execAsync(command, {
        cwd: this.classifierDir,
        maxBuffer: 1 * 1024 * 1024,
        timeout: 30000,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });
      stdout = result.stdout;
    } catch (execError: unknown) {
      const error = execError as ExecException;
      this.logger.error(
        `Classifier exec failed for ${safeTicker}: ${error.message}; stderr=${error.stderr ?? ''}`,
      );
      throw new Error(
        `Python classifier failed for ${safeTicker}: ${error.message}`,
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
