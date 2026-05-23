import { Quadrant } from './quadrant';

describe('Quadrant', () => {
  describe('fromCoordinates', () => {
    it('returns Leading when both x and y are strictly above 100', () => {
      expect(Quadrant.fromCoordinates(101, 101).value).toBe('Leading');
      expect(Quadrant.fromCoordinates(150, 200).value).toBe('Leading');
    });

    it('returns Weakening when x > 100 and y < 100', () => {
      expect(Quadrant.fromCoordinates(101, 99).value).toBe('Weakening');
      expect(Quadrant.fromCoordinates(150, 50).value).toBe('Weakening');
    });

    it('returns Lagging when both x and y are strictly below 100', () => {
      expect(Quadrant.fromCoordinates(99, 99).value).toBe('Lagging');
      expect(Quadrant.fromCoordinates(50, 50).value).toBe('Lagging');
    });

    it('returns Improving when x < 100 and y > 100', () => {
      expect(Quadrant.fromCoordinates(99, 101).value).toBe('Improving');
      expect(Quadrant.fromCoordinates(50, 150).value).toBe('Improving');
    });

    it('treats x == 100 as Improving regardless of y (else branch)', () => {
      // x > 100 is the gate for Leading/Weakening; x == 100 falls through.
      // y < 100 ⇒ ! (x > 100 && y < 100), so we go to else ⇒ Improving.
      // This pins current behavior even at the boundary.
      expect(Quadrant.fromCoordinates(100, 101).value).toBe('Improving');
      expect(Quadrant.fromCoordinates(100, 99).value).toBe('Improving');
      expect(Quadrant.fromCoordinates(100, 100).value).toBe('Improving');
    });

    it('treats y == 100 as Improving when x > 100 (else branch)', () => {
      // x > 100 is true but y < 100 is false (y == 100), so neither
      // Leading nor Weakening matches. Falls to else ⇒ Improving.
      expect(Quadrant.fromCoordinates(101, 100).value).toBe('Improving');
    });

    it('treats y == 100 as Improving when x < 100 (else branch)', () => {
      // x < 100 true but y < 100 false, so not Lagging. y > 100 false, so
      // explicit Improving branch is not matched either — falls to else.
      expect(Quadrant.fromCoordinates(99, 100).value).toBe('Improving');
    });
  });

  describe('equals', () => {
    it('returns true for the same quadrant', () => {
      expect(Quadrant.Leading.equals(Quadrant.Leading)).toBe(true);
    });

    it('returns false for different quadrants', () => {
      expect(Quadrant.Leading.equals(Quadrant.Lagging)).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns the quadrant name', () => {
      expect(Quadrant.Leading.toString()).toBe('Leading');
      expect(Quadrant.Weakening.toString()).toBe('Weakening');
      expect(Quadrant.Lagging.toString()).toBe('Lagging');
      expect(Quadrant.Improving.toString()).toBe('Improving');
    });
  });
});
