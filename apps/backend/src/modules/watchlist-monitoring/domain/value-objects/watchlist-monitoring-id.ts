import { UuidGeneratorService } from '../../../../shared/services/uuid-generator.service';

export class WatchlistMonitoringId {
  private constructor(public readonly value: string) {}

  static of(id: string): WatchlistMonitoringId {
    if (!id || id.trim().length === 0) {
      throw new Error(`WatchlistMonitoringId cannot be empty: ${id}`);
    }
    return new WatchlistMonitoringId(id.trim());
  }

  static new(): WatchlistMonitoringId {
    const uuid = UuidGeneratorService.generate();
    return new WatchlistMonitoringId(uuid);
  }

  toString() {
    return this.value;
  }
}
