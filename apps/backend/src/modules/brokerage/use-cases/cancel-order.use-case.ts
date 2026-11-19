import { Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type { BrokerageService } from '../domain/services/brokerage.service';
import { NotFoundError } from '../domain/domain-errors';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import { BrokerOrderId } from '../domain/value-objects/broker-order-id';
import { BrokerageAccess } from './brokerage-access';

export interface CancelOrderRequestDto {
  accountId: BrokerAccountId;
  orderId: BrokerOrderId;
}

@Injectable()
export class CancelOrderUseCase {
  constructor(
    private readonly brokerageAccess: BrokerageAccess,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  async execute(
    request: CancelOrderRequestDto,
    authContext: AuthContext,
  ): Promise<void> {
    await this.brokerageAccess.assertOwnerOfAccount(
      authContext,
      request.accountId,
    );

    const orders = await this.brokerageService.getWorkingOrders(
      request.accountId,
    );
    if (!orders.some((order) => order.orderId.equals(request.orderId))) {
      throw new NotFoundError(
        `Working order ${request.orderId.value} not found`,
      );
    }

    await this.brokerageService.cancelOrder(request.accountId, request.orderId);
  }
}
