export class IsoTimestamp {
  private constructor(public readonly value: string) {}
  static of(ts: string): IsoTimestamp {
    const date = new Date(ts);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ISO timestamp: ${ts}`);
    }

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
