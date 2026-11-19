import { ConfigService } from '@nestjs/config';
import { BrokerUnavailableError } from '../../domain/domain-errors';
import { IbkrGatewayClient } from './ibkr-gateway.client';

function clientFor(gatewayUrl: string | undefined): IbkrGatewayClient {
  const config = {
    get: jest.fn().mockReturnValue(gatewayUrl),
  } as unknown as ConfigService;
  return new IbkrGatewayClient(config);
}

describe('IbkrGatewayClient', () => {
  it('should report the gateway as not configured when the URL is unset', async () => {
    await expect(
      clientFor(undefined).request('GET', '/iserver/accounts'),
    ).rejects.toThrow(
      new BrokerUnavailableError(
        'The IBKR gateway is not configured: set IBKR_GATEWAY_URL',
      ),
    );
  });

  it('should report the gateway as not running when nothing listens', async () => {
    await expect(
      clientFor('https://localhost:1/v1/api').request(
        'GET',
        '/iserver/accounts',
      ),
    ).rejects.toThrow(
      new BrokerUnavailableError(
        'The IBKR gateway is not running at https://localhost:1',
      ),
    );
  });
});
