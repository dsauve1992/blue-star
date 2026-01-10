import { UuidGeneratorService } from '../../../../shared/services/uuid-generator.service';

export class WatchlistId {
  private constructor(public readonly value: string) {}

  static of(id: string): WatchlistId {
    if (!id || id.trim().length === 0) {
      throw new Error(`WatchlistId cannot be empty: ${id}`);
    }
    return new WatchlistId(id.trim());
  }

  static new(): WatchlistId {
    const uuid = UuidGeneratorService.generate();
    return new WatchlistId(uuid);
  }

  toString() {
    return this.value;
  }
}
