import { NotificationTitle } from './notification-title';

describe('NotificationTitle', () => {
  it('should accept a valid title', () => {
    expect(NotificationTitle.of('Breakout on AAPL').value).toBe(
      'Breakout on AAPL',
    );
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['201 characters', 'a'.repeat(201)],
  ])('should reject %s', (_label, value) => {
    expect(() => NotificationTitle.of(value)).toThrow();
  });

  it('should accept exactly 200 characters', () => {
    expect(NotificationTitle.of('a'.repeat(200)).value).toHaveLength(200);
  });
});
