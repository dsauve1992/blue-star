import { UuidGeneratorService } from '../services/uuid-generator.service';

export class PositionId {
  private constructor(public readonly value: string) {}

  static of(id: string): PositionId {
    if (!id || id.trim().length === 0) {
      throw new Error(`PositionId cannot be empty: ${id}`);
    }
    return new PositionId(id.trim());
  }

  static new(): PositionId {
    const uuid = UuidGeneratorService.generate();
    return new PositionId(uuid);
  }

  toString() {
    return this.value;
  }
}
