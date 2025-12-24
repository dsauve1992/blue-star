export class WatchlistName {
  private constructor(public readonly value: string) {}

  static of(name: string): WatchlistName {
    if (!name || name.trim().length === 0) {
      throw new Error(`WatchlistName cannot be empty: ${name}`);
    }
    const trimmed = name.trim();
    if (trimmed.length > 255) {
      throw new Error(
        `WatchlistName cannot exceed 255 characters: ${trimmed.length}`,
      );
    }
    return new WatchlistName(trimmed);
  }

  toString() {
    return this.value;
  }
}
