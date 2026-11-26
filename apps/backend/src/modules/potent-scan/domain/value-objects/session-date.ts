import { InvariantError } from '../domain-errors';

export class SessionDate {
  private constructor(public readonly value: string) {}

  static of(value: string): SessionDate {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new InvariantError(`Invalid session date: ${value}`);
    }
    return new SessionDate(value);
  }

  equals(other: SessionDate): boolean {
    return this.value === other.value;
  }
}
