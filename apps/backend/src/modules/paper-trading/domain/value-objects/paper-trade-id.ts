import { UuidGeneratorService } from '../../../../shared/services/uuid-generator.service';

export class PaperTradeId {
  private constructor(public readonly value: string) {}

  static of(id: string): PaperTradeId {
    if (!id || id.trim().length === 0) {
      throw new Error(`PaperTradeId cannot be empty: ${id}`);
    }
    return new PaperTradeId(id.trim());
  }

  static new(): PaperTradeId {
    return new PaperTradeId(UuidGeneratorService.generate());
  }

  toString() {
    return this.value;
  }
}
