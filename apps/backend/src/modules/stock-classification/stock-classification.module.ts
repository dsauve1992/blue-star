import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import {
  STOCK_CLASSIFICATION_REPOSITORY,
  STOCK_CLASSIFIER_SERVICE,
} from './constants/tokens';
import { StockClassificationRepositoryImpl } from './infrastructure/repositories/stock-classification.repository';
import { PythonStockClassifierService } from './infrastructure/services/python-stock-classifier.service';
import { GetOrFetchStockClassificationUseCase } from './use-cases/get-or-fetch-stock-classification.use-case';

export { STOCK_CLASSIFICATION_REPOSITORY, STOCK_CLASSIFIER_SERVICE };

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: STOCK_CLASSIFICATION_REPOSITORY,
      useClass: StockClassificationRepositoryImpl,
    },
    {
      provide: STOCK_CLASSIFIER_SERVICE,
      useClass: PythonStockClassifierService,
    },
    GetOrFetchStockClassificationUseCase,
  ],
  exports: [
    GetOrFetchStockClassificationUseCase,
    STOCK_CLASSIFICATION_REPOSITORY,
  ],
})
export class StockClassificationModule {}
