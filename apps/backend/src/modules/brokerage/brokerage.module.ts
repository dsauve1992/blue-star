import { Module } from '@nestjs/common';
import { BrokerageController } from './api/brokerage.controller';
import { BrokerageApiMapper } from './api/brokerage-api.mapper';
import { BROKERAGE_SERVICE } from './constants/tokens';
import { IbkrGatewayClient } from './infrastructure/services/ibkr-gateway.client';
import { IbkrClientPortalBrokerageService } from './infrastructure/services/ibkr-client-portal-brokerage.service';
import { BrokerageAccess } from './use-cases/brokerage-access';
import { ListBrokerAccountsUseCase } from './use-cases/list-broker-accounts.use-case';
import { GetBrokerPositionsUseCase } from './use-cases/get-broker-positions.use-case';
import { GetWorkingOrdersUseCase } from './use-cases/get-working-orders.use-case';
import { GetExecutionsUseCase } from './use-cases/get-executions.use-case';
import { PlaceBracketOrderUseCase } from './use-cases/place-bracket-order.use-case';
import { ConfirmOrderUseCase } from './use-cases/confirm-order.use-case';
import { ModifyOrderUseCase } from './use-cases/modify-order.use-case';
import { CancelOrderUseCase } from './use-cases/cancel-order.use-case';
import { GetTradingJournalUseCase } from './use-cases/get-trading-journal.use-case';

@Module({
  controllers: [BrokerageController],
  providers: [
    IbkrGatewayClient,
    {
      provide: BROKERAGE_SERVICE,
      useClass: IbkrClientPortalBrokerageService,
    },
    BrokerageAccess,
    BrokerageApiMapper,
    ListBrokerAccountsUseCase,
    GetBrokerPositionsUseCase,
    GetWorkingOrdersUseCase,
    GetExecutionsUseCase,
    PlaceBracketOrderUseCase,
    ConfirmOrderUseCase,
    ModifyOrderUseCase,
    CancelOrderUseCase,
    GetTradingJournalUseCase,
  ],
})
export class BrokerageModule {}
