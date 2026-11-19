import { ConfigService } from '@nestjs/config';
import { UserId } from '../../../../shared/value-objects/user-id';
import { AuthorizationError, NotFoundError } from '../../domain/domain-errors';
import type { BrokerageService } from '../../domain/services/brokerage.service';
import { BrokerAccountId } from '../../domain/value-objects/broker-account-id';
import { BrokerageAccess } from '../brokerage-access';

const OWNER = { userId: UserId.of('owner-user') };
const ACCOUNT = BrokerAccountId.of('DU1234567');

function accessWith(ownerUserId: string | undefined): {
  access: BrokerageAccess;
  brokerageService: jest.Mocked<BrokerageService>;
} {
  const config = {
    get: jest.fn().mockReturnValue(ownerUserId),
  } as unknown as ConfigService;
  const brokerageService = {
    listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
  } as unknown as jest.Mocked<BrokerageService>;
  return {
    access: new BrokerageAccess(config, brokerageService),
    brokerageService,
  };
}

describe('BrokerageAccess', () => {
  it('should let the configured owner through', async () => {
    const { access } = accessWith('owner-user');

    await expect(
      access.assertOwnerOfAccount(OWNER, ACCOUNT),
    ).resolves.toBeUndefined();
  });

  it('should refuse everybody when no owner is configured', () => {
    const { access } = accessWith(undefined);

    expect(() => access.assertOwner(OWNER)).toThrow(AuthorizationError);
  });

  it('should refuse a user who is not the owner, without calling the broker', async () => {
    const { access, brokerageService } = accessWith('owner-user');

    await expect(
      access.assertOwnerOfAccount({ userId: UserId.of('someone') }, ACCOUNT),
    ).rejects.toThrow(AuthorizationError);
    expect(brokerageService.listAccounts).not.toHaveBeenCalled();
  });

  it('should refuse an account the gateway session does not hold', async () => {
    const { access } = accessWith('owner-user');

    await expect(
      access.assertOwnerOfAccount(OWNER, BrokerAccountId.of('U0000001')),
    ).rejects.toThrow(NotFoundError);
  });
});
