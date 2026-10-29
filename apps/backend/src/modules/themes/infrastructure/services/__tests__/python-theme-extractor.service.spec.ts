import { exec } from 'child_process';
import { existsSync } from 'node:fs';
import { PythonThemeExtractorService } from '../python-theme-extractor.service';

jest.mock('child_process', () => ({ exec: jest.fn() }));
jest.mock('node:fs', () => ({ existsSync: jest.fn() }));

type ExecCallback = (
  error: Error | null,
  result?: { stdout: string; stderr: string },
) => void;

const execMock = exec as unknown as jest.Mock;

const succeedWith = (stdout: string, stderr = '') =>
  execMock.mockImplementation(
    (_command: string, _options: unknown, callback: ExecCallback) =>
      callback(null, { stdout, stderr }),
  );

const failWith = (error: Record<string, unknown>) =>
  execMock.mockImplementation(
    (_command: string, _options: unknown, callback: ExecCallback) =>
      callback(Object.assign(new Error('Command failed'), error)),
  );

describe('PythonThemeExtractorService', () => {
  let service: PythonThemeExtractorService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    (existsSync as jest.Mock).mockReturnValue(true);
    service = new PythonThemeExtractorService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    execMock.mockReset();
  });

  it('parses the JSON on stdout and ignores stderr progress lines', async () => {
    succeedWith(
      '[{"theme":"AI","tickers":["NVDA","AMD"]}]',
      'Found 12 candidates\nProcessing AI',
    );

    await expect(service.extractThemes()).resolves.toEqual([
      { theme: 'AI', tickers: ['NVDA', 'AMD'] },
    ]);
  });

  it('extracts the JSON array from surrounding stdout text', async () => {
    succeedWith('loading model...\n[{"theme":"AI","tickers":["NVDA"]}]\ndone');

    await expect(service.extractThemes()).resolves.toEqual([
      { theme: 'AI', tickers: ['NVDA'] },
    ]);
  });

  it('reports a timeout when the child is killed', async () => {
    failWith({ code: null, signal: 'SIGTERM', killed: true, stdout: '' });

    await expect(service.extractThemes()).rejects.toThrow(
      'Python theme extractor timed out after 600s',
    );
  });

  it('fails without a double prefix when the script exits non-zero with no output', async () => {
    failWith({ code: 1, stdout: '', stderr: 'boom' });

    const error = await service.extractThemes().catch((e: Error) => e);

    expect((error as Error).message).toContain(
      'Python theme extractor failed to execute',
    );
    expect((error as Error).message).not.toContain('Error: ');
  });

  it('fails when stdout contains no JSON array', async () => {
    succeedWith('nothing useful here');

    await expect(service.extractThemes()).rejects.toThrow(
      'did not return valid JSON',
    );
  });

  it('fails when the bracketed output is not valid JSON', async () => {
    succeedWith('[{not json}]');

    await expect(service.extractThemes()).rejects.toThrow(
      'Failed to parse Python theme extractor JSON output',
    );
  });
});
