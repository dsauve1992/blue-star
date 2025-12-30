export type QuadrantType = 'Leading' | 'Weakening' | 'Lagging' | 'Improving';

export class Quadrant {
  private constructor(public readonly value: QuadrantType) {}

  static Leading = new Quadrant('Leading');
  static Weakening = new Quadrant('Weakening');
  static Lagging = new Quadrant('Lagging');
  static Improving = new Quadrant('Improving');

  static fromCoordinates(x: number, y: number): Quadrant {
    if (x > 0 && y > 0) {
      return Quadrant.Leading;
    } else if (x > 0 && y < 0) {
      return Quadrant.Weakening;
    } else if (x < 0 && y < 0) {
      return Quadrant.Lagging;
    } else {
      return Quadrant.Improving;
    }
  }

  equals(other: Quadrant): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

