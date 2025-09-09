export class UserId {
  private constructor(public readonly value: string) {}

  static of(id: string): UserId {
    if (!id || id.trim().length === 0) {
      throw new Error(`UserId cannot be empty: ${id}`);
    }
    return new UserId(id.trim());
  }

  toString() {
    return this.value;
  }
}
