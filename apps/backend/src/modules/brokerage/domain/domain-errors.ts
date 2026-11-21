export {
  DomainError,
  AuthorizationError,
  NotFoundError,
} from '../../../common/errors';
import { DomainError } from '../../../common/errors';

export class InvariantError extends DomainError {}
export class BrokerUnavailableError extends DomainError {}
export class BrokerRejectedError extends DomainError {}
