import { Module } from '@nestjs/common';
import { PositionController } from './position.controller';

@Module({
  imports: [],
  controllers: [PositionController],
  providers: [],
})
export class PositionModule {}
