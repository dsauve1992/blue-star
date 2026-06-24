import { LocalDate } from './local-date';

describe('LocalDate', () => {
  it('round-trips through fromKey', () => {
    const date = LocalDate.fromKey('2026-06-24');
    expect(date.key).toBe('2026-06-24');
  });

  it('treats two dates with the same key as equal', () => {
    expect(
      LocalDate.fromKey('2026-06-24').equals(LocalDate.fromKey('2026-06-24')),
    ).toBe(true);
  });

  it('treats different days as unequal', () => {
    expect(
      LocalDate.fromKey('2026-06-24').equals(LocalDate.fromKey('2026-06-25')),
    ).toBe(false);
  });

  it('stringifies to its key', () => {
    expect(LocalDate.fromKey('2026-06-24').toString()).toBe('2026-06-24');
  });

  it('rejects an invalid key', () => {
    expect(() => LocalDate.fromKey('not-a-date')).toThrow(
      'Invalid local date key',
    );
  });
});
