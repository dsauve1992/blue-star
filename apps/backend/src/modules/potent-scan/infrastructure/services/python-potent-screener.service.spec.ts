import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';
import { PythonPotentScreenerService } from './python-potent-screener.service';

jest.mock('../../../../shared/services/python-script-runner', () => ({
  ...jest.requireActual<
    typeof import('../../../../shared/services/python-script-runner')
  >('../../../../shared/services/python-script-runner'),
  PythonScriptRunner: jest.fn(),
}));

const PYTHON_HIT = {
  symbol: 'AAA',
  exchange: 'NASDAQ',
  change: 12.5,
  close: 42.1,
  adr_pct: 5.2,
  relative_volume_10d_calc: 3.4,
  market_cap_basic: 1.2e9,
  sector: 'Technology',
  industry: 'Semiconductors',
  EMA9: 40,
  EMA21: 38,
  EMA50: 35,
  tier: 'Lead',
};

const RESPONSE = {
  scan_date: '2026-11-26',
  universe_size: 2400,
  hits: [PYTHON_HIT],
  near_misses: [
    {
      ...PYTHON_HIT,
      symbol: 'CCC',
      tier: null,
      value_traded: 4e6,
      avg_value_traded_30d: 2e6,
    },
  ],
};

const HIT = {
  symbol: 'AAA',
  exchange: 'NASDAQ',
  changePct: 12.5,
  close: 42.1,
  adrPct: 5.2,
  relativeVolume: 3.4,
  marketCap: 1.2e9,
  sector: 'Technology',
  industry: 'Semiconductors',
  ema9: 40,
  ema21: 38,
  ema50: 35,
  tier: 'Lead',
};

describe('PythonPotentScreenerService', () => {
  let run: jest.Mock;
  let service: PythonPotentScreenerService;

  beforeEach(() => {
    run = jest.fn();
    (PythonScriptRunner as unknown as jest.Mock).mockImplementation(() => ({
      run,
    }));
    service = new PythonPotentScreenerService();
  });

  it('runs potent_scan_service.py with --quiet and maps hits and near misses', async () => {
    run.mockResolvedValue({ stdout: JSON.stringify(RESPONSE), stderr: '' });

    const result = await service.scan();

    expect(PythonScriptRunner).toHaveBeenCalledWith(
      'screener',
      'potent_scan_service.py',
    );
    expect(run).toHaveBeenCalledWith(['--quiet'], {
      timeoutMs: 600000,
      maxBufferBytes: 10 * 1024 * 1024,
    });
    expect(result).toEqual({
      universeSize: 2400,
      hits: [HIT],
      nearMisses: [
        {
          ...HIT,
          symbol: 'CCC',
          tier: null,
          valueTraded: 4e6,
          avgValueTraded30d: 2e6,
        },
      ],
    });
  });

  it('throws the script error reported on stdout', async () => {
    run.mockRejectedValue(
      new PythonScriptError(
        'exit 1',
        1,
        false,
        JSON.stringify({ error: 'No gainers in the universe' }),
        '',
      ),
    );

    await expect(service.scan()).rejects.toThrow(
      'Potent scan screener error: No gainers in the universe',
    );
  });
});
