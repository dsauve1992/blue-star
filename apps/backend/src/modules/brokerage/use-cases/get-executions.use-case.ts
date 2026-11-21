import { Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../auth/auth.module';
import { BROKERAGE_SERVICE } from '../constants/tokens';
import type {
  BrokerageService,
  Execution,
} from '../domain/services/brokerage.service';
import { BrokerAccountId } from '../domain/value-objects/broker-account-id';
import { BrokerageAccess } from './brokerage-access';

export interface GetExecutionsRequestDto {
  accountId: BrokerAccountId;
}

export interface GetExecutionsResponseDto {
  executions: Execution[];
}

@Injectable()
export class GetExecutionsUseCase {
  constructor(
    private readonly brokerageAccess: BrokerageAccess,
    @Inject(BROKERAGE_SERVICE)
    private readonly brokerageService: BrokerageService,
  ) {}

  async execute(
    request: GetExecutionsRequestDto,
    authContext: AuthContext,
  ): Promise<GetExecutionsResponseDto> {
    await this.brokerageAccess.assertOwnerOfAccount(
      authContext,
      request.accountId,
    );
    return {
      executions: await this.brokerageService.getExecutions(request.accountId),
    };
  }
}
