export class ScanDate {
  private constructor(public readonly value: Date) {}

  static of(date: Date): ScanDate {
    return new ScanDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }

  static today(): ScanDate {
    return ScanDate.of(new Date());
  }

  toISOString(): string {
    return this.value.toISOString().split('T')[0];
  }
}
