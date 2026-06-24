import { DateTime } from 'luxon';

const KEY_FORMAT = 'yyyy-LL-dd';

export class LocalDate {
  private constructor(private readonly date: DateTime) {}

  static fromKey(key: string): LocalDate {
    const parsed = DateTime.fromFormat(key, KEY_FORMAT, { zone: 'utc' });
    if (!parsed.isValid) {
      throw new Error(`Invalid local date key: ${key}`);
    }
    return new LocalDate(parsed.startOf('day'));
  }

  get key(): string {
    return this.date.toFormat(KEY_FORMAT);
  }

  equals(other: LocalDate): boolean {
    return this.key === other.key;
  }

  toString(): string {
    return this.key;
  }
}
