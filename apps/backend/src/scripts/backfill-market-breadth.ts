import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BackfillMarketBreadthUseCase } from '../modules/market-breadth/use-cases/backfill-market-breadth.use-case';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flush = args.includes('--flush');
  const sessionsArg = args.find((arg) => arg !== '--flush');

  if (sessionsArg !== undefined && !/^[1-9]\d*$/.test(sessionsArg)) {
    console.error(`Invalid session count: ${sessionsArg}`);
    process.exit(1);
  }

  const sessions = sessionsArg ? parseInt(sessionsArg, 10) : undefined;

  const app = await NestFactory.createApplicationContext(AppModule);
  const backfill = app.get(BackfillMarketBreadthUseCase);

  try {
    const result = await backfill.execute({ sessions, flush });
    if (flush) {
      console.log('Flushed all market breadth aggregates and membership.');
    }
    console.log(
      `Backfilled ${result.sessionsRecomputed.length} sessions from a universe of ${result.fetchedUniverseSize} symbols.`,
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
