import { PotentScan } from '../entities/potent-scan';
import { SessionDate } from '../value-objects/session-date';

export interface PotentScanRepository {
  replace(scan: PotentScan): Promise<void>;
  exists(sessionDate: SessionDate): Promise<boolean>;
  findBySessionDate(sessionDate: SessionDate): Promise<PotentScan | null>;
  findLatest(): Promise<PotentScan | null>;
  listSessionDates(): Promise<SessionDate[]>;
}
