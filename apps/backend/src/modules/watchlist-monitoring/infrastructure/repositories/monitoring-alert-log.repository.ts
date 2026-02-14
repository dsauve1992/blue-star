import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { MonitoringType } from '../../domain/value-objects/monitoring-type';
import type { MonitoringAlertLogRepository } from '../../domain/repositories/monitoring-alert-log.repository.interface';

@Injectable()
export class MonitoringAlertLogRepositoryImpl
  implements MonitoringAlertLogRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async hasAlerted(
    ticker: string,
    marketDate: string,
    type: MonitoringType,
  ): Promise<boolean> {
    const query = `
      SELECT 1 FROM monitoring_alert_log
      WHERE market_date = $1::date AND ticker = $2 AND type = $3
      LIMIT 1
    `;
    const result = await this.databaseService.query(query, [
      marketDate,
      ticker,
      type,
    ]);
    return result.rows.length > 0;
  }

  async recordAlert(
    ticker: string,
    marketDate: string,
    type: MonitoringType,
  ): Promise<void> {
    const query = `
      INSERT INTO monitoring_alert_log (market_date, ticker, type)
      VALUES ($1::date, $2, $3)
      ON CONFLICT (market_date, ticker, type) DO NOTHING
    `;
    await this.databaseService.query(query, [marketDate, ticker, type]);
  }
}
