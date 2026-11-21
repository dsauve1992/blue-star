import { InvariantError } from '../domain-errors';

export class OrderQuantity {
  private constructor(public readonly value: number) {}

  static of(quantity: number): OrderQuantity {
    if (
      typeof quantity !== 'number' ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new InvariantError(
        `Order quantity must be a positive number: ${quantity}`,
      );
    }
    return new OrderQuantity(quantity);
  }
}
