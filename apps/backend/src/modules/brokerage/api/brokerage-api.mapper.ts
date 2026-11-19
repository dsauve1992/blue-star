import { Injectable } from '@nestjs/common';
import type {
  BrokerPosition,
  Execution,
  OrderSubmission,
  WorkingOrder,
} from '../domain/services/brokerage.service';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import type {
  BrokerPositionApiDto,
  ExecutionApiDto,
  OrderSubmissionApiResponseDto,
  WorkingOrderApiDto,
} from './brokerage-api.dto';

@Injectable()
export class BrokerageApiMapper {
  mapAccounts(accounts: BrokerAccountId[]): string[] {
    return accounts.map((account) => account.value);
  }

  mapPosition(position: BrokerPosition): BrokerPositionApiDto {
    return { ...position, accountId: position.accountId.value };
  }

  mapWorkingOrder(order: WorkingOrder): WorkingOrderApiDto {
    return {
      ...order,
      accountId: order.accountId.value,
      orderId: order.orderId.value,
    };
  }

  mapExecution(execution: Execution): ExecutionApiDto {
    return {
      ...execution,
      accountId: execution.accountId.value,
      executedAt: execution.executedAt.toISOString(),
    };
  }

  mapSubmission(submission: OrderSubmission): OrderSubmissionApiResponseDto {
    if (submission.status === 'CONFIRMATION_REQUIRED') {
      return {
        status: submission.status,
        replyId: submission.replyId.value,
        messages: submission.messages,
      };
    }
    return {
      status: submission.status,
      orderIds: submission.orderIds.map((orderId) => orderId.value),
    };
  }
}
