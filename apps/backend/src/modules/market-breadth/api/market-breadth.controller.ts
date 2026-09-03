import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import {
  QueryMarketBreadthResponseDto,
  QueryMarketBreadthUseCase,
} from '../use-cases/query-market-breadth.use-case';
import {
  RunMarketBreadthResponseDto,
  RunMarketBreadthUseCase,
} from '../use-cases/run-market-breadth.use-case';

const MAX_LIMIT = 10000;

@Controller('market-breadth')
export class MarketBreadthController {
  constructor(
    private readonly queryMarketBreadthUseCase: QueryMarketBreadthUseCase,
    private readonly runMarketBreadthUseCase: RunMarketBreadthUseCase,
  ) {}

  @Get()
  @Public()
  async history(
    @Query('limit') limit?: string,
  ): Promise<QueryMarketBreadthResponseDto> {
    if (limit === undefined) {
      return this.queryMarketBreadthUseCase.execute();
    }

    const parsedLimit = parseInt(limit, 10);
    if (
      !/^[1-9]\d*$/.test(limit) ||
      !Number.isSafeInteger(parsedLimit) ||
      parsedLimit > MAX_LIMIT
    ) {
      throw new BadRequestException(
        `limit must be a positive integer no greater than ${MAX_LIMIT}`,
      );
    }

    return this.queryMarketBreadthUseCase.execute(parsedLimit);
  }

  @Post('run')
  async run(): Promise<RunMarketBreadthResponseDto> {
    return this.runMarketBreadthUseCase.execute();
  }
}
