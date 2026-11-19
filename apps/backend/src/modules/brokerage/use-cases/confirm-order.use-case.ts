import { Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type {
  BrokerageService,
  OrderSubmission,
} from '../domain/services/brokerage.service';
import { OrderReplyId } from '../domain/value-objects/order-reply-id';
import { BrokerageAccess } from './brokerage-access';

export interface ConfirmOrderRequestDto {
  replyId: OrderReplyId;
}

@Injectable()
export class ConfirmOrderUseCase {
  constructor(
    private readonly brokerageAccess: BrokerageAccess,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  async execute(
    request: ConfirmOrderRequestDto,
    authContext: AuthContext,
  ): Promise<OrderSubmission> {
    this.brokerageAccess.assertOwner(authContext);
    return this.brokerageService.confirmOrder(request.replyId);
  }
}
