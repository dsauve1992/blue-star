import { NotificationTopic } from './notification-topic';

describe('NotificationTopic', () => {
  it('should accept a valid topic', () => {
    expect(NotificationTopic.of('blue-star_alerts1').value).toBe(
      'blue-star_alerts1',
    );
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['65 characters', 'a'.repeat(65)],
    ['a space', 'blue star'],
    ['a dot', 'blue.star'],
    ['a slash', 'blue/star'],
  ])('should reject %s', (_label, value) => {
    expect(() => NotificationTopic.of(value)).toThrow();
  });

  it.each([
    ['underscores', 'blue_star'],
    ['hyphens', 'blue-star'],
  ])('should accept %s', (_label, value) => {
    expect(NotificationTopic.of(value).value).toBe(value);
  });

  it('should accept exactly 64 characters', () => {
    expect(NotificationTopic.of('a'.repeat(64)).value).toHaveLength(64);
  });
});
