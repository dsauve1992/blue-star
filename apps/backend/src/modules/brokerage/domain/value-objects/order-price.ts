import { InvariantError } from '../domain-errors';

export class OrderPrice {
  private constructor(public readonly value: number) {}

  static of(price: number): OrderPrice {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new InvariantError(
        `Order price must be a positive number: ${price}`,
      );
    }
    return new OrderPrice(price);
  }
}
