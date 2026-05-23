import { RotationMember } from './rotation-member';
import { RotationUniverse } from './rotation-universe';

function tech(): RotationMember {
  return RotationMember.of('Technology', 'XLK');
}
function fin(): RotationMember {
  return RotationMember.of('Financial', 'XLF');
}

describe('RotationUniverse', () => {
  describe('of', () => {
    it('builds a universe with members and benchmark', () => {
      const u = RotationUniverse.of({
        id: 'gics-sector',
        label: 'GICS Sectors',
        members: [tech(), fin()],
        benchmarkSymbol: 'spy',
      });
      expect(u.id).toBe('gics-sector');
      expect(u.label).toBe('GICS Sectors');
      expect(u.members).toHaveLength(2);
      expect(u.benchmarkSymbol).toBe('SPY');
    });

    it('rejects empty id', () => {
      expect(() =>
        RotationUniverse.of({
          id: '',
          label: 'L',
          members: [tech()],
          benchmarkSymbol: 'SPY',
        }),
      ).toThrow('RotationUniverse id cannot be empty');
    });

    it('rejects empty label', () => {
      expect(() =>
        RotationUniverse.of({
          id: 'x',
          label: '',
          members: [tech()],
          benchmarkSymbol: 'SPY',
        }),
      ).toThrow('RotationUniverse label cannot be empty');
    });

    it('rejects empty members', () => {
      expect(() =>
        RotationUniverse.of({
          id: 'x',
          label: 'L',
          members: [],
          benchmarkSymbol: 'SPY',
        }),
      ).toThrow('at least one member');
    });

    it('rejects empty benchmark', () => {
      expect(() =>
        RotationUniverse.of({
          id: 'x',
          label: 'L',
          members: [tech()],
          benchmarkSymbol: '',
        }),
      ).toThrow('benchmarkSymbol cannot be empty');
    });
  });

  describe('lookups', () => {
    const u = RotationUniverse.of({
      id: 'gics-sector',
      label: 'GICS Sectors',
      members: [tech(), fin()],
      benchmarkSymbol: 'SPY',
    });

    it('findBySymbol matches case-insensitively and trimmed', () => {
      expect(u.findBySymbol('xlk')?.name).toBe('Technology');
      expect(u.findBySymbol('  XLF  ')?.name).toBe('Financial');
    });

    it('findBySymbol returns null for unknown', () => {
      expect(u.findBySymbol('FOO')).toBeNull();
      expect(u.findBySymbol('')).toBeNull();
    });

    it('findByName returns the matching member', () => {
      expect(u.findByName('Technology')?.symbol).toBe('XLK');
    });

    it('findByName returns null for unknown', () => {
      expect(u.findByName('Crypto')).toBeNull();
    });

    it('hasSymbol reflects membership', () => {
      expect(u.hasSymbol('XLK')).toBe(true);
      expect(u.hasSymbol('FOO')).toBe(false);
    });
  });
});
