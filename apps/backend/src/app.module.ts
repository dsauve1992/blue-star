import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PositionModule } from './modules/position/position.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { StockAnalysisModule } from './modules/stock-analysis/stock-analysis.module';
import { ThemesModule } from './modules/themes/themes.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { AuthModule } from './modules/auth/auth.module';
import { SectorRotationModule } from './modules/sector-rotation/sector-rotation.module';
import { AuthGuard } from './modules/auth/auth.guard';
import { DatabaseModule } from './config/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    PositionModule,
    MarketDataModule,
    StockAnalysisModule,
    ThemesModule,
    WatchlistModule,
    AuthModule,
    SectorRotationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
