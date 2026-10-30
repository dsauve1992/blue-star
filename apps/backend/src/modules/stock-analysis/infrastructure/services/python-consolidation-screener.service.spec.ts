import { Logger } from '@nestjs/common';
import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';
import { PythonConsolidationScreenerService } from './python-consolidation-screener.service';

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
  daily: [],
  weekly: [
    {
      symbol: 'AAPL',
      is_new: true,
      ticker_full_name: 'NASDAQ:AAPL',
      sector: 'Tech',
      industry: 'Hardware',
    },
  ],
  dailyCount: 0,
  weeklyCount: 1,
};

describe('PythonConsolidationScreenerService', () => {
  let run: jest.Mock;
  let service: PythonConsolidationScreenerService;

  beforeEach(() => {
    run = jest.fn();
    (PythonScriptRunner as unknown as jest.Mock).mockImplementation(() => ({
      run,
    }));
    service = new PythonConsolidationScreenerService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs the main.py script', () => {
    expect(PythonScriptRunner).toHaveBeenCalledWith('screener', 'main.py');
  });

  it('passes the flags as argv entries and maps the response', async () => {
    run.mockResolvedValue({ stdout: JSON.stringify(RESPONSE), stderr: '' });

    const result = await service.analyzeConsolidations({ type: 'weekly' });

    expect(run).toHaveBeenCalledWith(
      ['--format=json', '--type=weekly', '--quiet'],
      OPTIONS,
    );
    expect(result).toEqual({
      daily: [],
      weekly: [expect.objectContaining({ symbol: 'AAPL', isNew: true })],
    });
  });

  it.each([
    ['empty', ''],
    ['usable', JSON.stringify(RESPONSE)],
  ])('throws a timed out error when stdout is %s', async (_, stdout) => {
    run.mockRejectedValue(TIMED_OUT(stdout));

    await expect(
      service.analyzeConsolidations({ type: 'weekly' }),
    ).rejects.toThrow('Python screener execution timed out');
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

    await expect(
      service.analyzeConsolidations({ type: 'weekly' }),
    ).resolves.toEqual({
      daily: [],
      weekly: [expect.objectContaining({ symbol: 'AAPL', isNew: true })],
    });
    expect(logError).toHaveBeenCalled();
  });

  it('throws when a non-zero exit left no stdout', async () => {
    run.mockRejectedValue(
      new PythonScriptError('exit 1', 1, false, '', 'boom'),
    );

    await expect(
      service.analyzeConsolidations({ type: 'weekly' }),
    ).rejects.toThrow(/Python screener failed to execute.*Exit code: 1.*boom/s);
  });
});
