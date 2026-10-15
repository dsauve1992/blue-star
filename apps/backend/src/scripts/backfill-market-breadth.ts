import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MarketBreadthAnalysisService } from '../modules/market-breadth/domain/services/market-breadth-analysis.service';
import { MarketBreadthRepository } from '../modules/market-breadth/domain/repositories/market-breadth.repository.interface';
import {
  MARKET_BREADTH_ANALYSIS_SERVICE,
  MARKET_BREADTH_REPOSITORY,
} from '../modules/market-breadth/constants/tokens';
import { BACKFILL_SESSIONS } from '../modules/market-breadth/infrastructure/services/market-breadth-analysis.service';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flush = args.includes('--flush');
  const sessionsArg = args.find((arg) => arg !== '--flush');

  if (sessionsArg !== undefined && !/^[1-9]\d*$/.test(sessionsArg)) {
    console.error(`Invalid session count: ${sessionsArg}`);
    process.exit(1);
  }

  const sessions = sessionsArg ? parseInt(sessionsArg, 10) : BACKFILL_SESSIONS;

  const app = await NestFactory.createApplicationContext(AppModule);
  const analysisService = app.get<MarketBreadthAnalysisService>(
    MARKET_BREADTH_ANALYSIS_SERVICE,
  );
  const repository = app.get<MarketBreadthRepository>(
    MARKET_BREADTH_REPOSITORY,
  );

  try {
    if (flush) {
      await repository.deleteAll();
      console.log('Flushed all market breadth aggregates and membership.');
    }
    const result = await analysisService.runBackfill(sessions);
    console.log(
      `Backfilled ${result.sessionsRecomputed.length} sessions from a universe of ${result.universeSize} symbols.`,
    );
    console.log(
      `Sessions: ${result.sessionsRecomputed[0]} .. ${result.sessionsRecomputed[result.sessionsRecomputed.length - 1]}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('Market breadth backfill failed:', error);
  process.exit(1);
});
