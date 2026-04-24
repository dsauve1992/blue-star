import { RsScore } from './rs-score';
import { InvariantError } from '../domain-errors';

describe('RsScore', () => {
  it.each([0, 0.5, 0.98, 1])('should accept valid score %p', (value) => {
    expect(RsScore.of(value).value).toBe(value);
  });

  it.each([-0.01, 1.01, NaN, Infinity, -Infinity])(
    'should reject invalid score %p',
    (value) => {
      expect(() => RsScore.of(value)).toThrow(InvariantError);
    },
  );
});
