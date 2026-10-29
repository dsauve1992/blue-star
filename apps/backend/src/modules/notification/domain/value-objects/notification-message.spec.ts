import { NotificationMessage } from './notification-message';

describe('NotificationMessage', () => {
  it('should accept a valid message', () => {
    expect(NotificationMessage.of('Breakout on AAPL').value).toBe(
      'Breakout on AAPL',
    );
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['4001 characters', 'a'.repeat(4001)],
  ])('should reject %s', (_label, value) => {
    expect(() => NotificationMessage.of(value)).toThrow();
  });

  it('should accept exactly 4000 characters', () => {
    expect(NotificationMessage.of('a'.repeat(4000)).value).toHaveLength(4000);
  });
});
