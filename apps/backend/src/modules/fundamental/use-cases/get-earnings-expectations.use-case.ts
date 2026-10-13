import { Inject, Injectable } from '@nestjs/common';
import { Symbol } from '../../../shared/value-objects/symbol';
import { EARNINGS_EXPECTATIONS_SERVICE } from '../constants/tokens';
import { EarningsExpectationsService } from '../domain/services/earnings-expectations.service';
import { EarningsExpectations } from '../domain/value-objects/earnings-expectations';

const SURPRISE_QUARTERS = 4;

export interface GetEarningsExpectationsRequestDto {
  symbol: Symbol;
}

export interface GetEarningsExpectationsResponseDto {
  expectations: EarningsExpectations;
}

@Injectable()
export class GetEarningsExpectationsUseCase {
  constructor(
    @Inject(EARNINGS_EXPECTATIONS_SERVICE)
    private readonly earningsExpectationsService: EarningsExpectationsService,
  ) {}

  async execute(
    request: GetEarningsExpectationsRequestDto,
  ): Promise<GetEarningsExpectationsResponseDto> {
    const expectations =
      await this.earningsExpectationsService.getEarningsExpectations(
        request.symbol,
      );

    const latestSurprisesFirst = [...expectations.surprises]
      .sort((a, b) => b.quarterEnd.localeCompare(a.quarterEnd))
      .slice(0, SURPRISE_QUARTERS);

    return {
      expectations: EarningsExpectations.of({
        symbol: expectations.symbol,
        surprises: latestSurprisesFirst,
        estimateTrends: expectations.estimateTrends,
      }),
    };
  }
}
