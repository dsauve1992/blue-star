import { UuidGeneratorService } from '../../../../shared/services/uuid-generator.service';
import { InvariantError } from '../domain-errors';

const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ClusterId {
  private constructor(public readonly value: string) {}

  static of(id: string): ClusterId {
    if (typeof id !== 'string' || !UUID_SHAPE.test(id.trim())) {
      throw new InvariantError(`ClusterId must be a UUID: ${id}`);
    }
    return new ClusterId(id.trim());
  }

  static new(): ClusterId {
    return new ClusterId(UuidGeneratorService.generate());
  }
}
