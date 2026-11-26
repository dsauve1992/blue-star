import { UuidGeneratorService } from '../../../../shared/services/uuid-generator.service';
import { InvariantError } from '../domain-errors';

const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ProposalId {
  private constructor(public readonly value: string) {}

  static of(id: string): ProposalId {
    if (typeof id !== 'string' || !UUID_SHAPE.test(id.trim())) {
      throw new InvariantError(`ProposalId must be a UUID: ${id}`);
    }
    return new ProposalId(id.trim());
  }

  static new(): ProposalId {
    return new ProposalId(UuidGeneratorService.generate());
  }
}
