import { Module } from '@nestjs/common';
import { PositionController } from './api/position.controller';
import { OpenPositionUseCase } from './use-cases/open-position.use-case';
import { SetStopLossUseCase } from './use-cases/set-stop-loss.use-case';
import { SellSharesUseCase } from './use-cases/sell-shares.use-case';
import { BuySharesUseCase } from './use-cases/buy-shares.use-case';
import { GetPositionsUseCase } from './use-cases/get-positions.use-case';
import {
  POSITION_WRITE_REPOSITORY,
  POSITION_READ_REPOSITORY,
} from './constants/tokens';
import { DatabaseModule } from '../config/database.module';
import { InMemoryPositionWriteRepository } from './infrastructure/repositories/position-write.repository';
import { InMemoryPositionReadRepository } from './infrastructure/repositories/position-read.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [PositionController],
  providers: [
    {
      provide: POSITION_WRITE_REPOSITORY,
      useClass: InMemoryPositionWriteRepository,
    },
    {
      provide: POSITION_READ_REPOSITORY,
      useClass: InMemoryPositionReadRepository,
    },
    OpenPositionUseCase,
    SetStopLossUseCase,
    SellSharesUseCase,
    BuySharesUseCase,
    GetPositionsUseCase,
  ],
})
export class PositionModule {}
