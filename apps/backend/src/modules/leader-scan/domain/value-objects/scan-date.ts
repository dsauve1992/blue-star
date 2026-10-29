export class ScanDate {
  private constructor(public readonly value: Date) {}

  static of(date: Date): ScanDate {
    return new ScanDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }

  static today(now: Date = new Date()): ScanDate {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const part = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);
    return ScanDate.of(new Date(part('year'), part('month') - 1, part('day')));
  }

  toISOString(): string {
    return this.value.toISOString().split('T')[0];
  }
}
