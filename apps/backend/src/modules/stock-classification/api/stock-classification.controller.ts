import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
} from '@nestjs/common';
import { Symbol } from '../../../shared/value-objects/symbol';
import { GetOrFetchStockClassificationUseCase } from '../use-cases/get-or-fetch-stock-classification.use-case';

export interface GetStockClassificationApiResponseDto {
  symbol: string;
  industryGroup: string | null;
}

@Controller('stock-classification')
export class StockClassificationController {
  private readonly logger = new Logger(StockClassificationController.name);

  constructor(
    private readonly getOrFetchClassification: GetOrFetchStockClassificationUseCase,
  ) {}

  @Get(':symbol')
  async getStockClassification(
    @Param('symbol') rawSymbol: string,
  ): Promise<GetStockClassificationApiResponseDto> {
    let symbol: Symbol;
    try {
      symbol = Symbol.of(rawSymbol);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid symbol',
      );
    }

    try {
      const classification = await this.getOrFetchClassification.execute(
        symbol.value,
      );
      return {
        symbol: symbol.value,
        industryGroup: classification.industryGroup,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to classify ${symbol.value}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { symbol: symbol.value, industryGroup: null };
    }
  }
}
