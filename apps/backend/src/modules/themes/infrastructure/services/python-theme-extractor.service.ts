import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { existsSync } from 'node:fs';

const execAsync = promisify(exec);

interface ExecException extends Error {
  code?: number;
  stdout?: string;
  stderr?: string;
  signal?: string;
}

interface ThemeExtractorResponse {
  theme: string;
  tickers: string[];
}

@Injectable()
export class PythonThemeExtractorService {
  private readonly pythonExecutable: string;
  private readonly extractorPath: string;
  private readonly extractorDir: string;

  constructor() {
    const backendDir = process.cwd();
    const workspaceRoot = resolve(backendDir, '..');
    this.extractorDir = resolve(workspaceRoot, 'theme_extractor');
    this.extractorPath = join(this.extractorDir, 'main.py');

    if (!existsSync(this.extractorPath)) {
      throw new Error(
        `Python theme extractor script not found at ${this.extractorPath}. Please ensure the theme_extractor is set up.`,
      );
    }

    const venvPython = join(this.extractorDir, 'venv', 'bin', 'python3');
    const venvPythonWindows = join(
      this.extractorDir,
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
        `Python virtual environment not found at ${venvPython}. Using system python3. Make sure dependencies are installed.`,
      );
    }

    console.log(
      `Python theme extractor configured: ${this.pythonExecutable} ${this.extractorPath}`,
    );
  }

  async extractThemes(): Promise<ThemeExtractorResponse[]> {
    try {
      const command = `${this.pythonExecutable} ${this.extractorPath}`;

      let stdout: string;
      let stderr: string;

      try {
        const result = await execAsync(command, {
          cwd: this.extractorDir,
          maxBuffer: 10 * 1024 * 1024,
          timeout: 600000,
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
        });
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (execError: unknown) {
        const error = execError as ExecException;

        stdout = error.stdout || '';
        stderr = error.stderr || '';

        const errorCode = error.code;
        const errorSignal = error.signal;

        const errorInfo = {
          command,
          cwd: this.extractorDir,
          pythonExecutable: this.pythonExecutable,
          extractorPath: this.extractorPath,
          errorCode,
          errorSignal,
          stdout: stdout.substring(0, 1000),
          stderr: stderr.substring(0, 1000),
          message: error.message,
          fullError: JSON.stringify(error),
        };

        console.error(
          'Python theme extractor execution failed:',
          JSON.stringify(errorInfo, null, 2),
        );

        if (!stdout || !stdout.trim()) {
          const errorDetails = [
            `Command: ${command}`,
            `Working directory: ${this.extractorDir}`,
            `Python executable: ${this.pythonExecutable}`,
            `Exit code: ${errorCode || 'unknown'}`,
            `Signal: ${errorSignal || 'none'}`,
            `Stdout: ${stdout || '(empty)'}`,
            `Stderr: ${stderr || '(empty)'}`,
            `Error message: ${error.message || 'No message'}`,
          ].join('\n');

          throw new Error(
            `Python theme extractor failed to execute.\n${errorDetails}`,
          );
        }
      }

      if (
        stderr &&
        !stderr.includes('Found') &&
        !stderr.includes('Processing')
      ) {
        console.warn('Python theme extractor stderr:', stderr);
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
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Python theme extractor execution timed out');
      }

      if (error instanceof SyntaxError) {
        throw new Error(
          `Failed to parse Python theme extractor output: ${error.message}`,
        );
      }

      throw new Error(`Failed to execute Python theme extractor: ${error}`);
    }
  }
}
