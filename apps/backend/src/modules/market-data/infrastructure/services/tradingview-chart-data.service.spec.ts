import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';
import { TradingViewChartDataService } from './tradingview-chart-data.service';

jest.mock('../../../../shared/services/python-script-runner', () => ({
  ...jest.requireActual<
    typeof import('../../../../shared/services/python-script-runner')
  >('../../../../shared/services/python-script-runner'),
  PythonScriptRunner: jest.fn(),
}));

const SUCCESS_JSON = JSON.stringify({
  symbol: 'AAPL',
  exchange: 'NASDAQ',
  interval: 'D',
  candles: [
    { time: '2024-01-02', open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
  ],
});

describe('TradingViewChartDataService', () => {
  let run: jest.Mock;
  let service: TradingViewChartDataService;

  beforeEach(() => {
    run = jest.fn();
    (PythonScriptRunner as unknown as jest.Mock).mockImplementation(() => ({
      run,
    }));
    service = new TradingViewChartDataService();
  });

  it('passes each argument as its own argv entry, shell metacharacters included', async () => {
    run.mockResolvedValue({ stdout: SUCCESS_JSON, stderr: '' });

    await service.getChartData('AAPL;id', 'NASDAQ', 'D', 100);

    expect(run).toHaveBeenCalledWith(
      ['--symbol=AAPL;id', '--exchange=NASDAQ', '--interval=D', '--bars=100'],
      { timeoutMs: 30000, maxBufferBytes: 10 * 1024 * 1024 },
    );
  });

  it('parses the JSON line into price points', async () => {
    run.mockResolvedValue({
      stdout: `warming up\n${SUCCESS_JSON}\n`,
      stderr: '',
    });

    const result = await service.getChartData('AAPL', 'NASDAQ', 'D', 1);

    expect(result.symbol).toBe('AAPL');
    expect(result.pricePoints).toHaveLength(1);
  });

  it('salvages stdout when the script fails after printing JSON', async () => {
    run.mockRejectedValue(
      new PythonScriptError('failed', 1, false, SUCCESS_JSON, 'warn'),
    );

    const result = await service.getChartData('AAPL', 'NASDAQ', 'D', 1);

    expect(result.pricePoints).toHaveLength(1);
  });

  it('throws the stderr when the script fails without output', async () => {
    run.mockRejectedValue(
      new PythonScriptError('failed', 1, false, '', 'no network'),
    );

    await expect(
      service.getChartData('AAPL', 'NASDAQ', 'D', 1),
    ).rejects.toThrow('TradingView chart data fetch failed: no network');
  });

  it('throws when no JSON line is returned', async () => {
    run.mockResolvedValue({ stdout: 'garbage', stderr: '' });

    await expect(
      service.getChartData('AAPL', 'NASDAQ', 'D', 1),
    ).rejects.toThrow('did not return valid JSON');
  });

  it('throws the script-reported error', async () => {
    run.mockResolvedValue({
      stdout: JSON.stringify({ error: 'bad symbol', candles: [] }),
      stderr: '',
    });

    await expect(
      service.getChartData('AAPL', 'NASDAQ', 'D', 1),
    ).rejects.toThrow('TradingView chart error: bad symbol');
  });
});
