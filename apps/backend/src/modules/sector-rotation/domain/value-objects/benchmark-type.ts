export type BenchmarkTypeValue = 'equal-weighted' | 'spx';

export class BenchmarkType {
  private constructor(public readonly value: BenchmarkTypeValue) {}

  static EqualWeighted = new BenchmarkType('equal-weighted');
  static SPX = new BenchmarkType('spx');

  static of(value: string): BenchmarkType {
    if (value === 'equal-weighted' || value === 'spx') {
      return new BenchmarkType(value);
    }
    throw new Error(
      `Invalid benchmark type: ${value}. Must be 'equal-weighted' or 'spx'`,
    );
  }

  equals(other: BenchmarkType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}


