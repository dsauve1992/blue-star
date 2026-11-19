import { InvariantError } from '../domain-errors';

export class BrokerOrderId {
  private constructor(public readonly value: string) {}

  static of(id: string): BrokerOrderId {
    if (typeof id !== 'string' || !/^\d{1,20}$/.test(id.trim())) {
      throw new InvariantError(`Invalid broker order id: ${id}`);
    }
    return new BrokerOrderId(id.trim());
  }

  equals(other: BrokerOrderId): boolean {
    return this.value === other.value;
  }
}
