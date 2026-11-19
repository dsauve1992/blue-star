import { InvariantError } from '../domain-errors';

export class BrokerAccountId {
  private constructor(public readonly value: string) {}

  static of(id: string): BrokerAccountId {
    if (typeof id !== 'string' || !/^[A-Z0-9]{1,32}$/.test(id.trim())) {
      throw new InvariantError(`Invalid broker account id: ${id}`);
    }
    return new BrokerAccountId(id.trim());
  }

  equals(other: BrokerAccountId): boolean {
    return this.value === other.value;
  }
}
