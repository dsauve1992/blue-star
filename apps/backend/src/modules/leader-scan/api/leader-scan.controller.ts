import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import {
  QueryLatestLeadersResponseDto,
  QueryLatestLeadersUseCase,
} from '../use-cases/query-latest-leaders.use-case';
import {
  QueryLeaderBySymbolResponseDto,
  QueryLeaderBySymbolUseCase,
} from '../use-cases/query-leader-by-symbol.use-case';
import {
  RunLeaderScanResponseDto,
  RunLeaderScanUseCase,
} from '../use-cases/run-leader-scan.use-case';

@Controller('leader-scan')
export class LeaderScanController {
  constructor(
    private readonly queryLatestLeadersUseCase: QueryLatestLeadersUseCase,
    private readonly queryLeaderBySymbolUseCase: QueryLeaderBySymbolUseCase,
    private readonly runLeaderScanUseCase: RunLeaderScanUseCase,
  ) {}

  @Get('latest')
  @Public()
  async latest(): Promise<QueryLatestLeadersResponseDto> {
    return this.queryLatestLeadersUseCase.execute();
  }

  @Get('symbol/:symbol')
  @Public()
  async bySymbol(
    @Param('symbol') symbol: string,
  ): Promise<QueryLeaderBySymbolResponseDto> {
    if (!symbol) {
      throw new BadRequestException('symbol is required');
    }
    return this.queryLeaderBySymbolUseCase.execute(symbol.toUpperCase());
  }

  @Post('run')
  async run(): Promise<RunLeaderScanResponseDto> {
    return this.runLeaderScanUseCase.execute();
  }
}
