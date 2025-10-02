import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../config/database.module';

@Module({
  controllers: [],
  imports: [DatabaseModule],
})
export class IntegrationTestModule {}
