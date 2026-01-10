import { Quadrant } from './quadrant';

export class SectorRotationDataPoint {
  private constructor(
    public readonly date: Date,
    public readonly sectorSymbol: string,
    public readonly price: number,
    public readonly relativeStrength: number,
    public readonly x: number,
    public readonly y: number,
    public readonly quadrant: Quadrant,
  ) {}

  static of(
    date: Date,
    sectorSymbol: string,
    price: number,
    relativeStrength: number,
    x: number,
    y: number,
    quadrant: Quadrant,
  ): SectorRotationDataPoint {
    if (!date || !(date instanceof Date)) {
      throw new Error('Date must be a valid Date object');
    }
    if (!sectorSymbol || sectorSymbol.trim().length === 0) {
      throw new Error('Sector symbol cannot be empty');
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Price must be a positive number: ${price}`);
    }
    if (!Number.isFinite(relativeStrength)) {
      throw new Error(
        `Relative strength must be a finite number: ${relativeStrength}`,
      );
    }
    if (!Number.isFinite(x)) {
      throw new Error(`X coordinate must be a finite number: ${x}`);
    }
    if (!Number.isFinite(y)) {
      throw new Error(`Y coordinate must be a finite number: ${y}`);
    }

    return new SectorRotationDataPoint(
      date,
      sectorSymbol.trim().toUpperCase(),
      price,
      relativeStrength,
      x,
      y,
      quadrant,
    );
  }

  equals(other: SectorRotationDataPoint): boolean {
    return (
      this.date.getTime() === other.date.getTime() &&
      this.sectorSymbol === other.sectorSymbol
    );
  }
}
