import { Module } from '@nestjs/common';
import { PositionController } from './position.controller';
import { OpenPositionUseCase } from './use-cases/open-position.use-case';
import { InMemoryPositionWriteRepository } from './infrastructure/repositories/position-write.repository';

export const POSITION_WRITE_REPOSITORY = 'POSITION_WRITE_REPOSITORY';

@Module({
  imports: [],
  controllers: [PositionController],
  providers: [
    OpenPositionUseCase,
    {
      provide: POSITION_WRITE_REPOSITORY,
      useClass: InMemoryPositionWriteRepository,
    },
  ],
})
export class PositionModule {}
