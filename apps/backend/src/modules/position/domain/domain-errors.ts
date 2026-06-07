export {
  DomainError,
  AuthorizationError,
  NotFoundError,
} from '../../../common/errors';
import { DomainError } from '../../../common/errors';

export class ChronologyError extends DomainError {}
export class StateError extends DomainError {}
export class InvariantError extends DomainError {}
