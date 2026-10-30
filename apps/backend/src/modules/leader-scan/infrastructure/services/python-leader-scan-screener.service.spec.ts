import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';
import { LeaderScanPayload } from '../../domain/services/leader-scan-screener.service';
import { PythonLeaderScanScreenerService } from './python-leader-scan-screener.service';

jest.mock('../../../../shared/services/python-script-runner', () => ({
  ...jest.requireActual<
    typeof import('../../../../shared/services/python-script-runner')
  >('../../../../shared/services/python-script-runner'),
  PythonScriptRunner: jest.fn(),
}));

const PAYLOAD: LeaderScanPayload = {
  scan_date: '2026-10-30',
  universe_size: 1200,
  leader_count: 1,
  results: [
    {
      ticker: 'NVDA',
      exchange: 'NASDAQ',
      sector: 'Technology',
      perf_1m: 12.5,
      perf_3m: 30.1,
      perf_6m: 55.2,
      rank_1m: 1,
      rank_3m: 2,
      rank_6m: 3,
      rs_score: 98,
      adr_20: 4.2,
      dollar_volume_20: 25000000000,
      top_1m_flag: true,
      top_3m_flag: true,
      top_6m_flag: true,
      small_size_flag: false,
    },
  ],
};

describe('PythonLeaderScanScreenerService', () => {
  let run: jest.Mock;
  let service: PythonLeaderScanScreenerService;

  beforeEach(() => {
    run = jest.fn();
    (PythonScriptRunner as unknown as jest.Mock).mockImplementation(() => ({
      run,
    }));
    service = new PythonLeaderScanScreenerService();
  });

  it('runs the script with json args and the timeout and buffer options', async () => {
    run.mockResolvedValue({ stdout: JSON.stringify(PAYLOAD), stderr: '' });

    const result = await service.runScan();

    expect(PythonScriptRunner).toHaveBeenCalledWith('leader-scan', 'main.py');
    expect(run).toHaveBeenCalledWith(['--format=json', '--quiet'], {
      timeoutMs: 600000,
      maxBufferBytes: 20 * 1024 * 1024,
    });
    expect(result).toEqual(PAYLOAD);
  });

  it('parses the JSON line when stdout has noise lines before it', async () => {
    run.mockResolvedValue({
      stdout: `loading universe...\nwarning: slow\n${JSON.stringify(PAYLOAD)}\n`,
      stderr: 'some stderr',
    });

    await expect(service.runScan()).resolves.toEqual(PAYLOAD);
  });

  it('reports a timeout even when the error carries stdout', async () => {
    run.mockRejectedValue(
      new PythonScriptError(
        'killed',
        null,
        true,
        JSON.stringify(PAYLOAD),
        'partial',
      ),
    );

    await expect(service.runScan()).rejects.toThrow(
      'Leader scan timed out after 10 minutes',
    );
  });

  it('reports the exit code and stderr on a non-zero exit', async () => {
    run.mockRejectedValue(
      new PythonScriptError('exit 2', 2, false, '', 'boom'),
    );

    await expect(service.runScan()).rejects.toThrow(
      'Leader scan failed. Exit code: 2. Stderr: boom',
    );
  });

  it('does not salvage stdout from a failed run', async () => {
    run.mockRejectedValue(
      new PythonScriptError('exit 1', 1, false, JSON.stringify(PAYLOAD), ''),
    );

    await expect(service.runScan()).rejects.toThrow(
      'Leader scan failed. Exit code: 1. Stderr: (empty)',
    );
  });

  it('rethrows errors that are not script errors unchanged', async () => {
    const error = new Error('spawn exploded');
    run.mockRejectedValue(error);

    await expect(service.runScan()).rejects.toBe(error);
  });

  it('rejects output without a JSON line', async () => {
    run.mockResolvedValue({ stdout: 'no json here', stderr: '' });

    await expect(service.runScan()).rejects.toThrow(
      'Leader scan did not return valid JSON. Output head: no json here',
    );
  });

  it('rejects an unparsable JSON line', async () => {
    run.mockResolvedValue({ stdout: '{not json}', stderr: '' });

    await expect(service.runScan()).rejects.toThrow(
      'Failed to parse leader scan JSON. Raw head: {not json}',
    );
  });
});
