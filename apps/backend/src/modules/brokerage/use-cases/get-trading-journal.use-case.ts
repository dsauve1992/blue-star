import { Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type { BrokerageService } from '../domain/services/brokerage.service';
import {
  buildTradingJournal,
  TradingJournal,
} from '../domain/services/trading-journal';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import { BrokerageAccess } from './brokerage-access';

export interface GetTradingJournalRequestDto {
  accountId: BrokerAccountId;
}

@Injectable()
export class GetTradingJournalUseCase {
  constructor(
    private readonly brokerageAccess: BrokerageAccess,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  async execute(
    request: GetTradingJournalRequestDto,
    authContext: AuthContext,
  ): Promise<TradingJournal> {
    await this.brokerageAccess.assertOwnerOfAccount(
      authContext,
      request.accountId,
    );
    const positions = await this.brokerageService.getPositions(
      request.accountId,
    );
    const executions = await this.brokerageService.getExecutions(
      request.accountId,
    );
    const ordersOfTheDay = await this.brokerageService.getOrdersOfTheDay(
      request.accountId,
    );
    return buildTradingJournal({ positions, executions, ordersOfTheDay });
  }
}
