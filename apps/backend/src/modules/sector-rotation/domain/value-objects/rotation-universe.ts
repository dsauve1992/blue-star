import { RotationMember } from './rotation-member';

export class RotationUniverse {
  private readonly memberBySymbol: Map<string, RotationMember>;
  private readonly memberByName: Map<string, RotationMember>;

  private constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly members: ReadonlyArray<RotationMember>,
    public readonly benchmarkSymbol: string,
  ) {
    this.memberBySymbol = new Map(members.map((m) => [m.symbol, m]));
    this.memberByName = new Map(members.map((m) => [m.name, m]));
  }

  static of(args: {
    id: string;
    label: string;
    members: RotationMember[];
    benchmarkSymbol: string;
  }): RotationUniverse {
    if (!args.id || args.id.trim().length === 0) {
      throw new Error('RotationUniverse id cannot be empty');
    }
    if (!args.label || args.label.trim().length === 0) {
      throw new Error('RotationUniverse label cannot be empty');
    }
    if (!args.members || args.members.length === 0) {
      throw new Error('RotationUniverse must contain at least one member');
    }
    if (!args.benchmarkSymbol || args.benchmarkSymbol.trim().length === 0) {
      throw new Error('RotationUniverse benchmarkSymbol cannot be empty');
    }
    return new RotationUniverse(
      args.id.trim(),
      args.label.trim(),
      Object.freeze([...args.members]),
      args.benchmarkSymbol.trim().toUpperCase(),
    );
  }

  findBySymbol(symbol: string): RotationMember | null {
    if (!symbol) return null;
    return this.memberBySymbol.get(symbol.trim().toUpperCase()) ?? null;
  }

  findByName(name: string): RotationMember | null {
    if (!name) return null;
    return this.memberByName.get(name.trim()) ?? null;
  }

  hasSymbol(symbol: string): boolean {
    return this.findBySymbol(symbol) !== null;
  }
}
