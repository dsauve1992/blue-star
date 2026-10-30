import { Logger } from '@nestjs/common';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';
import { PythonRsRatingScreenerService } from './python-rs-rating-screener.service';

jest.mock('../../../../shared/services/python-script-runner', () => ({
  ...jest.requireActual<
    typeof import('../../../../shared/services/python-script-runner')
  >('../../../../shared/services/python-script-runner'),
  PythonScriptRunner: jest.fn(),
}));

const OPTIONS = { timeoutMs: 600000, maxBufferBytes: 10 * 1024 * 1024 };
const TIMED_OUT = (stdout: string) =>
  new PythonScriptError('killed', null, true, stdout, '');

const RESPONSE = {
  ratings: [{ symbol: 'AAPL', rs_rating: 91, weighted_score: 1.23 }],
  count: 1,
  computed_at: '2026-10-30',
};

describe('PythonRsRatingScreenerService', () => {
  let run: jest.Mock;
  let service: PythonRsRatingScreenerService;

  beforeEach(() => {
    run = jest.fn();
    (PythonScriptRunner as unknown as jest.Mock).mockImplementation(() => ({
      run,
    }));
    service = new PythonRsRatingScreenerService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs the rs_rating_service.py script', () => {
    expect(PythonScriptRunner).toHaveBeenCalledWith(
      'screener',
      'rs_rating_service.py',
    );
  });

  it('passes the flags as argv entries and maps the response', async () => {
    run.mockResolvedValue({ stdout: JSON.stringify(RESPONSE), stderr: '' });

    const result = await service.fetchRsRatings();

    expect(run).toHaveBeenCalledWith(['--format=json', '--quiet'], OPTIONS);
    expect(result).toEqual([
      { symbol: 'AAPL', rsRating: 91, weightedScore: 1.23 },
    ]);
  });

  it.each([
    ['empty', ''],
    ['usable', JSON.stringify(RESPONSE)],
  ])('throws a timed out error when stdout is %s', async (_, stdout) => {
    run.mockRejectedValue(TIMED_OUT(stdout));

    await expect(service.fetchRsRatings()).rejects.toThrow(
      'RS rating screener execution timed out',
    );
  });

  it('returns results when a non-zero exit still left usable stdout', async () => {
    run.mockRejectedValue(
      new PythonScriptError(
        'exit 1',
        1,
        false,
        JSON.stringify(RESPONSE),
        'err',
      ),
    );

    const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await expect(service.fetchRsRatings()).resolves.toEqual([
      { symbol: 'AAPL', rsRating: 91, weightedScore: 1.23 },
    ]);
    expect(logError).toHaveBeenCalled();
  });

  it('throws when a non-zero exit left no stdout', async () => {
    run.mockRejectedValue(
      new PythonScriptError('exit 1', 1, false, '', 'boom'),
    );

    await expect(service.fetchRsRatings()).rejects.toThrow(
      /RS rating screener failed.*Exit code: 1.*boom/s,
    );
  });
});
