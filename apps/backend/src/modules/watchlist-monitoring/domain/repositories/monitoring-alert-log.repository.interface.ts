import { MonitoringType } from '../value-objects/monitoring-type';

export interface MonitoringAlertLogRepository {
  hasAlerted(
    ticker: string,
    marketDate: string,
    type: MonitoringType,
  ): Promise<boolean>;
  recordAlert(
    ticker: string,
    marketDate: string,
    type: MonitoringType,
  ): Promise<void>;
}
