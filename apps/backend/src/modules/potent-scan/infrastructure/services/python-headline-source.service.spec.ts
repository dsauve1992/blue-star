import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';
import { PythonHeadlineSource } from './python-headline-source.service';

jest.mock('../../../../shared/services/python-script-runner', () => ({
  ...jest.requireActual<
    typeof import('../../../../shared/services/python-script-runner')
  >('../../../../shared/services/python-script-runner'),
  PythonScriptRunner: jest.fn(),
}));

describe('PythonHeadlineSource', () => {
  let run: jest.Mock;

  beforeEach(() => {
    run = jest.fn();
    jest
      .mocked(PythonScriptRunner)
      .mockImplementation(() => ({ run }) as unknown as PythonScriptRunner);
  });

  it('should map headlines per symbol and keep per-ticker fetch errors', async () => {
    run.mockResolvedValue({
      stdout: JSON.stringify({
        headlines: {
          AAA: {
            items: [
              {
                title: 'AAA beats',
                publisher: 'Reuters',
                url: 'https://news.example.com/aaa',
                published_at: '2026-11-25T21:00:00Z',
              },
            ],
            error: null,
          },
          BBB: { items: [], error: 'Yahoo down' },
        },
      }),
      stderr: '',
    });

    const result = await new PythonHeadlineSource().fetch([
      'AAA',
      'BBB',
      'CCC',
    ]);

    expect(run).toHaveBeenNthCalledWith(
      1,
      ['--tickers', 'AAA,BBB,CCC'],
      expect.any(Object),
    );
    expect(result).toEqual([
      {
        symbol: 'AAA',
        headlines: [
          {
            title: 'AAA beats',
            publisher: 'Reuters',
            url: 'https://news.example.com/aaa',
            publishedAt: '2026-11-25T21:00:00Z',
          },
        ],
        fetchError: null,
      },
      { symbol: 'BBB', headlines: [], fetchError: 'Yahoo down' },
      {
        symbol: 'CCC',
        headlines: [],
        fetchError: 'Missing from headline output',
      },
    ]);
  });

  it('should fail when the script fails', async () => {
    run.mockRejectedValue(
      new PythonScriptError('boom', 1, false, '', 'ImportError: yfinance'),
    );

    await expect(new PythonHeadlineSource().fetch(['AAA'])).rejects.toThrow(
      'Headline fetch failed. Exit code: 1. Stderr: ImportError: yfinance',
    );
  });
});
