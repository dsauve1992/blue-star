import {
  PythonScriptError,
  PythonScriptRunner,
} from '../../../../shared/services/python-script-runner';
import { PythonStockClassifierService } from './python-stock-classifier.service';

jest.mock('../../../../shared/services/python-script-runner', () => ({
  ...jest.requireActual<
    typeof import('../../../../shared/services/python-script-runner')
  >('../../../../shared/services/python-script-runner'),
  PythonScriptRunner: jest.fn(),
}));

const RESPONSE = {
  ticker: 'AAPL',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  industryKey: 'consumer-electronics',
};

describe('PythonStockClassifierService', () => {
  let run: jest.Mock;
  let service: PythonStockClassifierService;

  beforeEach(() => {
    run = jest.fn();
    (PythonScriptRunner as unknown as jest.Mock).mockImplementation(() => ({
      run,
    }));
    service = new PythonStockClassifierService();
  });

  it('passes the normalised ticker as a single argv entry', async () => {
    run.mockResolvedValue({ stdout: JSON.stringify(RESPONSE), stderr: '' });

    const result = await service.classify(' aapl ');

    expect(run).toHaveBeenCalledWith(['AAPL'], {
      timeoutMs: 30000,
      maxBufferBytes: 1024 * 1024,
    });
    expect(result).toEqual(RESPONSE);
  });

  it('rejects an invalid ticker without running the script', async () => {
    await expect(service.classify('AAPL; id')).rejects.toThrow(
      'Invalid ticker for classifier',
    );
    expect(run).not.toHaveBeenCalled();
  });

  it('wraps a script failure', async () => {
    run.mockRejectedValue(new PythonScriptError('exit 1', 1, false, '', 'err'));

    await expect(service.classify('AAPL')).rejects.toThrow(
      'Python classifier failed for AAPL: exit 1',
    );
  });

  it('rejects invalid JSON output', async () => {
    run.mockResolvedValue({ stdout: 'nope', stderr: '' });

    await expect(service.classify('AAPL')).rejects.toThrow(
      'Classifier returned invalid JSON for AAPL: nope',
    );
  });
});
