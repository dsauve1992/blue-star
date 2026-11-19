import { Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type {
  BrokerageService,
  OrderChanges,
  OrderSubmission,
} from '../domain/services/brokerage.service';
import { InvariantError, NotFoundError } from '../domain/domain-errors';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import { BrokerOrderId } from '../domain/value-objects/broker-order-id';
import { BrokerageAccess } from './brokerage-access';

export interface ModifyOrderRequestDto {
  accountId: BrokerAccountId;
  orderId: BrokerOrderId;
  changes: OrderChanges;
}

@Injectable()
export class ModifyOrderUseCase {
  constructor(
    private readonly brokerageAccess: BrokerageAccess,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  async execute(
    request: ModifyOrderRequestDto,
    authContext: AuthContext,
  ): Promise<OrderSubmission> {
    if (!request.changes.price && !request.changes.quantity) {
      throw new InvariantError('Nothing to modify: give a price or a quantity');
    }
    await this.brokerageAccess.assertOwnerOfAccount(
      authContext,
      request.accountId,
    );

    const orders = await this.brokerageService.getWorkingOrders(
      request.accountId,
    );
    const order = orders.find((candidate) =>
      candidate.orderId.equals(request.orderId),
    );
    if (!order) {
      throw new NotFoundError(
        `Working order ${request.orderId.value} not found`,
      );
    }

    return this.brokerageService.modifyOrder(order, request.changes);
  }
}
