import { Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type {
  BracketOrder,
  BrokerageService,
  OrderSubmission,
} from '../domain/services/brokerage.service';
import { InvariantError } from '../domain/domain-errors';
import { BrokerageAccess } from './brokerage-access';

export type PlaceBracketOrderRequestDto = BracketOrder;

@Injectable()
export class PlaceBracketOrderUseCase {
  constructor(
    private readonly brokerageAccess: BrokerageAccess,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  async execute(
    request: PlaceBracketOrderRequestDto,
    authContext: AuthContext,
  ): Promise<OrderSubmission> {
    assertCoherentBracket(request);
    await this.brokerageAccess.assertOwnerOfAccount(
      authContext,
      request.accountId,
    );
    return this.brokerageService.placeBracketOrder(request);
  }
}

function assertCoherentBracket(order: BracketOrder): void {
  if (order.entryType === 'MARKET' && order.entryPrice) {
    throw new InvariantError('A market entry takes no entry price');
  }
  if (order.entryType !== 'MARKET' && !order.entryPrice) {
    throw new InvariantError(`A ${order.entryType} entry needs an entry price`);
  }
  if (!order.entryPrice) {
    return;
  }

  const entry = order.entryPrice.value;
  const stop = order.stopLossPrice.value;
  const target = order.takeProfitPrice?.value;
  const isLong = order.side === 'BUY';

  if (isLong ? stop >= entry : stop <= entry) {
    throw new InvariantError(
      `The stop-loss must be ${isLong ? 'below' : 'above'} the entry price`,
    );
  }
  if (target !== undefined && (isLong ? target <= entry : target >= entry)) {
    throw new InvariantError(
      `The take-profit must be ${isLong ? 'above' : 'below'} the entry price`,
    );
  }
}
