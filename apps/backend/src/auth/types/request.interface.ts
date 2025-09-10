import type { AuthenticatedUser } from '../current-user.decorator';

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
