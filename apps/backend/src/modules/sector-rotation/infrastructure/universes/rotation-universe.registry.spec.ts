import { RotationUniverseRegistry } from './rotation-universe.registry';

describe('RotationUniverseRegistry', () => {
  let registry: RotationUniverseRegistry;

  beforeEach(() => {
    registry = new RotationUniverseRegistry();
  });

  it('exposes the gics-sector universe as the default', () => {
    expect(RotationUniverseRegistry.defaultUniverseId()).toBe('gics-sector');
    const universe = registry.get('gics-sector');
    expect(universe.id).toBe('gics-sector');
    expect(universe.members.length).toBeGreaterThan(0);
  });

  it('also registers the gics-industry-group universe', () => {
    const universe = registry.get('gics-industry-group');
    expect(universe.id).toBe('gics-industry-group');
    expect(universe.members).toHaveLength(25);
  });

  it('has() reflects registered universes', () => {
    expect(registry.has('gics-sector')).toBe(true);
    expect(registry.has('gics-industry-group')).toBe(true);
    expect(registry.has('does-not-exist')).toBe(false);
  });

  it('get() throws on unknown id with the registered list in the message', () => {
    expect(() => registry.get('does-not-exist')).toThrow(
      /Unknown rotation universe/,
    );
    expect(() => registry.get('does-not-exist')).toThrow(/gics-sector/);
    expect(() => registry.get('does-not-exist')).toThrow(/gics-industry-group/);
  });

  it('listIds() returns all registered ids', () => {
    expect(registry.listIds()).toEqual(
      expect.arrayContaining(['gics-sector', 'gics-industry-group']),
    );
  });

  it('listUniverses() returns all registered universes', () => {
    const universes = registry.listUniverses();
    expect(universes.length).toBeGreaterThanOrEqual(2);
    expect(universes.find((u) => u.id === 'gics-sector')).toBeDefined();
    expect(universes.find((u) => u.id === 'gics-industry-group')).toBeDefined();
  });
});
