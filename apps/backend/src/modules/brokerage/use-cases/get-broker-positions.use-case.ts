import { Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type {
  BrokerageService,
  BrokerPosition,
} from '../domain/services/brokerage.service';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import { BrokerageAccess } from './brokerage-access';

export interface GetBrokerPositionsRequestDto {
  accountId: BrokerAccountId;
}

export interface GetBrokerPositionsResponseDto {
  positions: BrokerPosition[];
}

@Injectable()
export class GetBrokerPositionsUseCase {
  constructor(
    private readonly brokerageAccess: BrokerageAccess,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  async execute(
    request: GetBrokerPositionsRequestDto,
    authContext: AuthContext,
  ): Promise<GetBrokerPositionsResponseDto> {
    await this.brokerageAccess.assertOwnerOfAccount(
      authContext,
      request.accountId,
    );
    return {
      positions: await this.brokerageService.getPositions(request.accountId),
    };
  }
}
