import { Logger } from '@nestjs/common';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';
import { PythonMomentumLeadersScreenerService } from './python-momentum-leaders-screener.service';

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
  scan_date: '2026-10-30',
  universe_size: 500,
  leader_count: 1,
  leaders: [
    {
      symbol: 'NVDA',
      exchange: 'NASDAQ',
      sector: '',
      perf_1m: 1,
      perf_3m: 2,
      perf_6m: 3,
      adr_pct: 4,
      rank_1m: 1,
      rank_3m: 2,
      rank_6m: 3,
      rs_score: 99,
      top_1m: true,
      top_3m: false,
      top_6m: true,
    },
  ],
};

describe('PythonMomentumLeadersScreenerService', () => {
  let run: jest.Mock;
  let service: PythonMomentumLeadersScreenerService;

  beforeEach(() => {
    run = jest.fn();
    (PythonScriptRunner as unknown as jest.Mock).mockImplementation(() => ({
      run,
    }));
    service = new PythonMomentumLeadersScreenerService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs the momentum_leaders_service.py script', () => {
    expect(PythonScriptRunner).toHaveBeenCalledWith(
      'screener',
      'momentum_leaders_service.py',
    );
  });

  it('passes the flags as argv entries and maps the response', async () => {
    run.mockResolvedValue({ stdout: JSON.stringify(RESPONSE), stderr: '' });

    const result = await service.fetchMomentumLeaders();

    expect(run).toHaveBeenCalledWith(['--format=json', '--quiet'], OPTIONS);
    expect(result).toEqual({
      scanDate: '2026-10-30',
      universeSize: 500,
      leaders: [
        {
          symbol: 'NVDA',
          exchange: 'NASDAQ',
          sector: null,
          perf1M: 1,
          perf3M: 2,
          perf6M: 3,
          adrPct: 4,
          rank1M: 1,
          rank3M: 2,
          rank6M: 3,
          rsScore: 99,
          top1M: true,
          top3M: false,
          top6M: true,
        },
      ],
    });
  });

  it.each([
    ['empty', ''],
    ['usable', JSON.stringify(RESPONSE)],
  ])('throws a timed out error when stdout is %s', async (_, stdout) => {
    run.mockRejectedValue(TIMED_OUT(stdout));

    await expect(service.fetchMomentumLeaders()).rejects.toThrow(
      'Momentum leaders screener execution timed out',
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

    await expect(service.fetchMomentumLeaders()).resolves.toEqual({
      scanDate: '2026-10-30',
      universeSize: 500,
      leaders: [
        {
          symbol: 'NVDA',
          exchange: 'NASDAQ',
          sector: null,
          perf1M: 1,
          perf3M: 2,
          perf6M: 3,
          adrPct: 4,
          rank1M: 1,
          rank3M: 2,
          rank6M: 3,
          rsScore: 99,
          top1M: true,
          top3M: false,
          top6M: true,
        },
      ],
    });
    expect(logError).toHaveBeenCalled();
  });

  it('throws when a non-zero exit left no stdout', async () => {
    run.mockRejectedValue(
      new PythonScriptError('exit 1', 1, false, '', 'boom'),
    );

    await expect(service.fetchMomentumLeaders()).rejects.toThrow(
      /Momentum leaders screener failed.*Exit code: 1.*boom/s,
    );
  });
});
