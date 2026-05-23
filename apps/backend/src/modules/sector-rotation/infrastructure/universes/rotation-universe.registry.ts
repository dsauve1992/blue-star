import { Injectable } from '@nestjs/common';
import { RotationUniverse } from '../../domain/value-objects/rotation-universe';
import {
  GICS_SECTOR_UNIVERSE,
  GICS_SECTOR_UNIVERSE_ID,
} from './gics-sector.universe';

@Injectable()
export class RotationUniverseRegistry {
  private readonly universes = new Map<string, RotationUniverse>([
    [GICS_SECTOR_UNIVERSE_ID, GICS_SECTOR_UNIVERSE],
  ]);

  get(id: string): RotationUniverse {
    const universe = this.universes.get(id);
    if (!universe) {
      throw new Error(
        `Unknown rotation universe: ${id}. Registered: ${this.listIds().join(', ')}`,
      );
    }
    return universe;
  }

  has(id: string): boolean {
    return this.universes.has(id);
  }

  listIds(): string[] {
    return Array.from(this.universes.keys());
  }

  listUniverses(): RotationUniverse[] {
    return Array.from(this.universes.values());
  }

  static defaultUniverseId(): string {
    return GICS_SECTOR_UNIVERSE_ID;
  }
}
