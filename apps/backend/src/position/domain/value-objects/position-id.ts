export class PositionId {
  private constructor(public readonly value: number) {}
  static of(id: number): PositionId {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`PositionId must be a positive integer: ${id}`);
    }
    return new PositionId(id);
  }
  toString() {
    return this.value.toString();
  }
}
