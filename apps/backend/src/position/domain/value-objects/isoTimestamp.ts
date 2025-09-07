export class IsoTimestamp {
  private constructor(public readonly value: string) {}
  static of(ts: string): IsoTimestamp {
    // Validate ISO-8601 format
    const date = new Date(ts);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ISO timestamp: ${ts}`);
    }
    // Check if the string representation matches the parsed date
    if (date.toISOString() !== ts) {
      throw new Error(`Timestamp must be in ISO-8601 format: ${ts}`);
    }
    return new IsoTimestamp(ts);
  }
  toString() {
    return this.value;
  }
  toDate(): Date {
    return new Date(this.value);
  }
}
