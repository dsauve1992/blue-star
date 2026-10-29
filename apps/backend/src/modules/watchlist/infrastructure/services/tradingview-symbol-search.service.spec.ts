import { TradingViewSymbolSearchService } from './tradingview-symbol-search.service';

describe('TradingViewSymbolSearchService', () => {
  let fetchSpy: jest.SpyInstance<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >;

  const respondWith = (body: unknown, status = 200) =>
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(body), { status }));

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it.each(['', '   '])(
    'returns [] without fetching for "%s"',
    async (query) => {
      const result = await new TradingViewSymbolSearchService().search(query);

      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it('strips HTML tags and builds the full symbol as EXCHANGE:SYMBOL', async () => {
    respondWith({
      symbols: [
        { symbol: '<em>AAPL</em>', description: 'Apple', exchange: 'NASDAQ' },
      ],
    });

    const result = await new TradingViewSymbolSearchService().search('aapl');

    expect(result).toEqual([
      {
        symbol: 'AAPL',
        description: 'Apple',
        exchange: 'NASDAQ',
        fullSymbol: 'NASDAQ:AAPL',
      },
    ]);
  });

  it('yields the bare symbol when the exchange is missing', async () => {
    respondWith({ symbols: [{ symbol: 'AAPL', description: 'Apple' }] });

    const [result] = await new TradingViewSymbolSearchService().search('aapl');

    expect(result.exchange).toBe('');
    expect(result.fullSymbol).toBe('AAPL');
  });

  it('throws with the status on a non-OK response', async () => {
    respondWith({}, 403);

    await expect(
      new TradingViewSymbolSearchService().search('aapl'),
    ).rejects.toThrow('Symbol search failed: HTTP 403');
  });

  it('passes an abort signal to fetch', async () => {
    respondWith({ symbols: [] });

    await new TradingViewSymbolSearchService().search('aapl');

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
