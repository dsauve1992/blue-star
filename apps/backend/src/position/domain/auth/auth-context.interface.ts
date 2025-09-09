import { UserId } from '../value-objects/user-id';

export interface AuthContext {
  userId: UserId;
  // Future fields can be added here like:
  // roles: string[];
  // permissions: string[];
  // sessionId: string;
  // expiresAt: Date;
}
