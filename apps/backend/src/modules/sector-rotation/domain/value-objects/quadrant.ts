export type QuadrantType = 'Leading' | 'Weakening' | 'Lagging' | 'Improving';

export class Quadrant {
  private constructor(public readonly value: QuadrantType) {}

  static Leading = new Quadrant('Leading');
  static Weakening = new Quadrant('Weakening');
  static Lagging = new Quadrant('Lagging');
  static Improving = new Quadrant('Improving');

  static fromCoordinates(x: number, y: number): Quadrant {
    const threshold = 100;
    if (x > threshold && y > threshold) {
      return Quadrant.Leading;
    } else if (x > threshold && y < threshold) {
      return Quadrant.Weakening;
    } else if (x < threshold && y < threshold) {
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

