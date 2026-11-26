import {
  PotentScanHit,
  PotentScanNearMiss,
} from '../value-objects/potent-scan-stock';

export interface PotentScreenerResult {
  universeSize: number;
  hits: PotentScanHit[];
  nearMisses: PotentScanNearMiss[];
}

export interface PotentScreenerService {
  scan(): Promise<PotentScreenerResult>;
}
