import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type { BrokerageService } from '../domain/services/brokerage.service';
import { AuthorizationError, NotFoundError } from '../domain/domain-errors';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';

@Injectable()
export class BrokerageAccess {
  constructor(
    private readonly configService: ConfigService,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  assertOwner(authContext: AuthContext): void {
    const ownerUserId = this.configService.get<string>(
      'BROKERAGE_OWNER_USER_ID',
    );
    if (!ownerUserId || ownerUserId !== authContext.userId.value) {
      throw new AuthorizationError('User may not access the brokerage account');
    }
  }

  async assertOwnerOfAccount(
    authContext: AuthContext,
    accountId: BrokerAccountId,
  ): Promise<void> {
    this.assertOwner(authContext);
    const accounts = await this.brokerageService.listAccounts();
    if (!accounts.some((account) => account.equals(accountId))) {
      throw new NotFoundError(`Broker account ${accountId.value} not found`);
    }
  }
}
