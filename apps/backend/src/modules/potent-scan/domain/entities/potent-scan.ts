import { InvariantError } from '../domain-errors';
import { SessionDate } from '../value-objects/session-date';
import {
  PotentScanHit,
  PotentScanNearMiss,
} from '../value-objects/potent-scan-stock';

export class PotentScan {
  private constructor(
    public readonly sessionDate: SessionDate,
    public readonly universeSize: number,
    public readonly hits: PotentScanHit[],
    public readonly nearMisses: PotentScanNearMiss[],
  ) {}

  static of(data: {
    sessionDate: SessionDate;
    universeSize: number;
    hits: PotentScanHit[];
    nearMisses: PotentScanNearMiss[];
  }): PotentScan {
    if (data.hits.length === 0) {
      throw new InvariantError(
        `Potent scan for ${data.sessionDate.value} has no hits (universe size ${data.universeSize})`,
      );
    }
    return new PotentScan(
      data.sessionDate,
      data.universeSize,
      data.hits,
      data.nearMisses,
    );
  }
}
