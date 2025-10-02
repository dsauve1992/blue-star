import { TestContainer } from './database/setupPostgresDbTestContainer';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MigrationService } from '../../src/config/migration.service';

module.exports = async function () {
  await TestContainer.init();

  const mod = await Test.createTestingModule({
    imports: [await ConfigModule.forRoot({ isGlobal: true })],
    providers: [MigrationService],
  }).compile();

  await mod.init();
  await mod.get(MigrationService).runMigrations();
  await mod.close();
};
