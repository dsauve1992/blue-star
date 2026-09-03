export class BreadthDate {
  private constructor(public readonly value: Date) {}

  static of(date: Date): BreadthDate {
    return new BreadthDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }

  static fromISOString(isoDate: string): BreadthDate {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new BreadthDate(new Date(year, month - 1, day));
  }

  static today(): BreadthDate {
    return BreadthDate.of(new Date());
  }

  toISOString(): string {
    const year = this.value.getFullYear();
    const month = String(this.value.getMonth() + 1).padStart(2, '0');
    const day = String(this.value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
