import { Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type {
  BrokerageService,
  BrokerOrder,
} from '../domain/services/brokerage.service';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import { BrokerageAccess } from './brokerage-access';

export interface GetWorkingOrdersRequestDto {
  accountId: BrokerAccountId;
}

export interface GetWorkingOrdersResponseDto {
  orders: BrokerOrder[];
}

@Injectable()
export class GetWorkingOrdersUseCase {
  constructor(
    private readonly brokerageAccess: BrokerageAccess,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  async execute(
    request: GetWorkingOrdersRequestDto,
    authContext: AuthContext,
  ): Promise<GetWorkingOrdersResponseDto> {
    await this.brokerageAccess.assertOwnerOfAccount(
      authContext,
      request.accountId,
    );
    return {
      orders: await this.brokerageService.getWorkingOrders(request.accountId),
    };
  }
}
