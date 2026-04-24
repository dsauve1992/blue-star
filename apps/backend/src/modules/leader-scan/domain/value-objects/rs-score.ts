import { InvariantError } from '../domain-errors';

export class RsScore {
  private constructor(public readonly value: number) {}

  static of(value: number): RsScore {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new InvariantError(`RS score must be in [0, 1], got ${value}`);
    }
    return new RsScore(value);
  }
}
