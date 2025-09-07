export class PositionId {
  private constructor(public readonly value: string) {}

  static of(id: string): PositionId {
    if (!id || id.trim().length === 0) {
      throw new Error(`PositionId cannot be empty: ${id}`);
    }
    return new PositionId(id.trim());
  }

  static new(): PositionId {
    // Generate a UUID v4
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );

    return new PositionId(uuid);
  }

  toString() {
    return this.value;
  }
}
