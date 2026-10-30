import { Logger } from '@nestjs/common';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../../shared/services/python-script-runner';
import { PythonThemeExtractorService } from '../python-theme-extractor.service';

const mockRun = jest.fn();

jest.mock('../../../../../shared/services/python-script-runner', () => {
  const actual = jest.requireActual<
    typeof import('../../../../../shared/services/python-script-runner')
  >('../../../../../shared/services/python-script-runner');
  return {
    ...actual,
    PythonScriptRunner: jest.fn().mockImplementation(() => ({ run: mockRun })),
  };
});

const succeedWith = (stdout: string, stderr = '') =>
  mockRun.mockResolvedValue({ stdout, stderr });

const failWith = (
  stdout: string,
  stderr: string,
  options: { exitCode?: number | null; timedOut?: boolean } = {},
) =>
  mockRun.mockRejectedValue(
    new PythonScriptError(
      'Command failed',
      options.exitCode === undefined ? 1 : options.exitCode,
      options.timedOut ?? false,
      stdout,
      stderr,
    ),
  );

describe('PythonThemeExtractorService', () => {
  let service: PythonThemeExtractorService;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    service = new PythonThemeExtractorService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockRun.mockReset();
  });

  it('parses the JSON on stdout and does not warn on stderr progress lines', async () => {
    succeedWith(
      '[{"theme":"AI","tickers":["NVDA","AMD"]}]',
      'Found 12 candidates\nProcessing AI',
    );

    await expect(service.extractThemes()).resolves.toEqual([
      { theme: 'AI', tickers: ['NVDA', 'AMD'] },
    ]);
    expect(PythonScriptRunner).toHaveBeenCalledWith(
      'theme_extractor',
      'main.py',
    );
    expect(mockRun).toHaveBeenCalledWith([], {
      timeoutMs: 600_000,
      maxBufferBytes: 10 * 1024 * 1024,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns on other stderr output', async () => {
    succeedWith('[{"theme":"AI","tickers":["NVDA"]}]', 'rate limited');

    await service.extractThemes();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('rate limited'));
  });

  it('extracts the JSON array from surrounding stdout text', async () => {
    succeedWith('loading model...\n[{"theme":"AI","tickers":["NVDA"]}]\ndone');

    await expect(service.extractThemes()).resolves.toEqual([
      { theme: 'AI', tickers: ['NVDA'] },
    ]);
  });

  it('reports a timeout', async () => {
    failWith('', '', { exitCode: null, timedOut: true });

    await expect(service.extractThemes()).rejects.toThrow(
      'Python theme extractor timed out after 600s',
    );
  });

  it('fails with stderr when the script exits non-zero with no output', async () => {
    failWith('', 'boom');

    await expect(service.extractThemes()).rejects.toThrow(
      'Python theme extractor failed: Command failed; stderr=boom',
    );
  });

  it('still parses usable stdout when the script exits non-zero', async () => {
    failWith('[{"theme":"AI","tickers":["NVDA"]}]', 'late failure');

    await expect(service.extractThemes()).resolves.toEqual([
      { theme: 'AI', tickers: ['NVDA'] },
    ]);
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
