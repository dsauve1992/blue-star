import { Module } from '@nestjs/common';
import { PositionController } from './api/position.controller';
import { PositionApiMapper } from './api/position-api.mapper';
import { OpenPositionUseCase } from './use-cases/open-position.use-case';
import { SetStopLossUseCase } from './use-cases/set-stop-loss.use-case';
import { SellSharesUseCase } from './use-cases/sell-shares.use-case';
import { BuySharesUseCase } from './use-cases/buy-shares.use-case';
import { GetPositionsUseCase } from './use-cases/get-positions.use-case';
import { GetPositionByIdUseCase } from './use-cases/get-position-by-id.use-case';
import {
  POSITION_READ_REPOSITORY,
  POSITION_WRITE_REPOSITORY,
} from './constants/tokens';
import { DatabaseModule } from '../../config/database.module';
import { PositionWriteRepository } from './infrastructure/repositories/position-write.repository';
import { PositionReadRepository } from './infrastructure/repositories/position-read.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [PositionController],
  providers: [
    {
      provide: POSITION_WRITE_REPOSITORY,
      useClass: PositionWriteRepository,
    },
    {
      provide: POSITION_READ_REPOSITORY,
      useClass: PositionReadRepository,
    },
    PositionApiMapper,
    OpenPositionUseCase,
    SetStopLossUseCase,
    SellSharesUseCase,
    BuySharesUseCase,
    GetPositionsUseCase,
    GetPositionByIdUseCase,
  ],
})
export class PositionModule {}
