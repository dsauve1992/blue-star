import { SessionDate } from '../value-objects/session-date';

export interface SessionCalendar {
  lastCompletedSession(): Promise<SessionDate>;
}
