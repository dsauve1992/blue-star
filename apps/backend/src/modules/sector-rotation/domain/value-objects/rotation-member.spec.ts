import { RotationMember } from './rotation-member';

describe('RotationMember', () => {
  describe('of', () => {
    it('builds a member with normalized name + uppercased symbol', () => {
      const m = RotationMember.of('  Technology  ', '  xlk  ');
      expect(m.name).toBe('Technology');
      expect(m.symbol).toBe('XLK');
    });

    it('rejects empty name', () => {
      expect(() => RotationMember.of('', 'XLK')).toThrow(
        'RotationMember name cannot be empty',
      );
      expect(() => RotationMember.of('   ', 'XLK')).toThrow(
        'RotationMember name cannot be empty',
      );
    });

    it('rejects empty symbol', () => {
      expect(() => RotationMember.of('Technology', '')).toThrow(
        'RotationMember symbol cannot be empty',
      );
      expect(() => RotationMember.of('Technology', '   ')).toThrow(
        'RotationMember symbol cannot be empty',
      );
    });
  });

  describe('equals', () => {
    it('returns true when name and symbol match', () => {
      const a = RotationMember.of('Technology', 'XLK');
      const b = RotationMember.of('Technology', 'XLK');
      expect(a.equals(b)).toBe(true);
    });

    it('returns false when name differs', () => {
      const a = RotationMember.of('Technology', 'XLK');
      const b = RotationMember.of('Energy', 'XLK');
      expect(a.equals(b)).toBe(false);
    });

    it('returns false when symbol differs', () => {
      const a = RotationMember.of('Technology', 'XLK');
      const b = RotationMember.of('Technology', 'XLF');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns the name', () => {
      expect(RotationMember.of('Technology', 'XLK').toString()).toBe(
        'Technology',
      );
    });
  });
});
