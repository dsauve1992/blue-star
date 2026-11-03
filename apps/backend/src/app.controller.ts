import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './config/database.service';
import { Public } from './modules/auth/auth.module';

const HEALTH_CHECK_TIMEOUT_MS = 3000;

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.databaseService.query('SELECT 1'),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Database health check timed out')),
            HEALTH_CHECK_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw new ServiceUnavailableException('Database unavailable');
    } finally {
      clearTimeout(timer);
    }
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
