import { Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type { BrokerageService } from '../domain/services/brokerage.service';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import { BrokerageAccess } from './brokerage-access';

export interface ListBrokerAccountsResponseDto {
  accounts: BrokerAccountId[];
}

@Injectable()
export class ListBrokerAccountsUseCase {
  constructor(
    private readonly brokerageAccess: BrokerageAccess,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  async execute(
    authContext: AuthContext,
  ): Promise<ListBrokerAccountsResponseDto> {
    this.brokerageAccess.assertOwner(authContext);
    return { accounts: await this.brokerageService.listAccounts() };
  }
}
