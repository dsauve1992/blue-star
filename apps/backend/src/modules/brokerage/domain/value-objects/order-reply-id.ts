import { InvariantError } from '../domain-errors';

export class OrderReplyId {
  private constructor(public readonly value: string) {}

  static of(id: string): OrderReplyId {
    if (typeof id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(id.trim())) {
      throw new InvariantError(`Invalid order reply id: ${id}`);
    }
    return new OrderReplyId(id.trim());
  }
}
