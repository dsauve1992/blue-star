import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { NotificationModule } from '../notification/notification.module';
import { ThemeRepositoryImpl } from './infrastructure/repositories/theme.repository';
import { PythonThemeExtractorService } from './infrastructure/services/python-theme-extractor.service';
import { ThemeServiceImpl } from './infrastructure/services/theme.service';
import { ThemeCronService } from './infrastructure/services/theme-cron.service';
import {
  THEME_REPOSITORY,
  THEME_EXTRACTOR_SERVICE,
  THEME_SERVICE,
} from './constants/tokens';

export { THEME_REPOSITORY, THEME_EXTRACTOR_SERVICE, THEME_SERVICE };

@Module({
  imports: [DatabaseModule, NotificationModule],
  providers: [
    PythonThemeExtractorService,
    {
      provide: THEME_REPOSITORY,
      useClass: ThemeRepositoryImpl,
    },
    {
      provide: THEME_EXTRACTOR_SERVICE,
      useClass: PythonThemeExtractorService,
    },
    {
      provide: THEME_SERVICE,
      useClass: ThemeServiceImpl,
    },
    ThemeCronService,
  ],
  exports: [THEME_REPOSITORY],
})
export class ThemesModule {}
