import type { ConfigService } from '@nestjs/config';
import { FinancialModelingPrepCompanyProfileService } from './financial-modeling-prep-company-profile.service';
import { Symbol } from '../../../../shared/value-objects/symbol';

describe('FinancialModelingPrepCompanyProfileService', () => {
  let fetchSpy: jest.SpyInstance<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >;

  const buildService = () =>
    new FinancialModelingPrepCompanyProfileService({
      get: () => 'test-key',
    } as unknown as ConfigService);

  const profileBody = {
    symbol: 'AAPL',
    sector: 'Technology',
    industry: 'Consumer Electronics',
  };

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  const requestedUrl = () => fetchSpy.mock.calls[0][0] as string;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse([profileBody]));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns symbol, sector and industry for an array response', async () => {
    const profile = await buildService().getCompanyProfile(Symbol.of('AAPL'));

    expect(profile).toEqual(profileBody);
  });

  it('strips the exchange prefix from the requested URL', async () => {
    await buildService().getCompanyProfile(Symbol.of('NYSE:AAPL'));

    expect(requestedUrl()).toBe(
      'https://financialmodelingprep.com/stable/profile?symbol=AAPL&apikey=test-key',
    );
  });

  it('rejects on a non-OK status with a single prefix', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 429 }));

    const error = await buildService()
      .getCompanyProfile(Symbol.of('AAPL'))
      .catch((e: Error) => e);

    expect((error as Error).message).toBe(
      'Failed to fetch company profile: HTTP error! status: 429',
    );
  });

  it('rejects on an empty payload', async () => {
    fetchSpy.mockResolvedValue(jsonResponse([]));

    await expect(
      buildService().getCompanyProfile(Symbol.of('AAPL')),
    ).rejects.toThrow(
      'Failed to fetch company profile: No profile data found for symbol: AAPL',
    );
  });

  it('passes an abort signal to fetch', async () => {
    await buildService().getCompanyProfile(Symbol.of('AAPL'));

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('keeps the original error as the cause', async () => {
    const cause = new Error('connect ECONNREFUSED');
    fetchSpy.mockRejectedValue(cause);

    const error = await buildService()
      .getCompanyProfile(Symbol.of('AAPL'))
      .catch((e: Error) => e);

    expect((error as Error).message).toBe(
      'Failed to fetch company profile: connect ECONNREFUSED',
    );
    expect((error as Error).cause).toBe(cause);
  });
});
