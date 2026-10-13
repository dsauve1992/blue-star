import { EarningsSurprise } from './earnings-surprise';

const surprise = (epsActual: number, epsEstimate: number) =>
  EarningsSurprise.of({ quarterEnd: '2026-06-30', epsActual, epsEstimate });

describe('EarningsSurprise', () => {
  it('reports a positive surprise when actual beats a positive estimate', () => {
    expect(surprise(1.2, 1).surprisePercent).toBeCloseTo(20);
  });

  it('reports a positive surprise when a loss is smaller than expected', () => {
    expect(surprise(-0.11, -0.13486).surprisePercent).toBeCloseTo(18.43, 1);
  });

  it('reports a negative surprise when a loss is wider than expected', () => {
    expect(surprise(-1.05, -0.95588).surprisePercent).toBeCloseTo(-9.85, 1);
  });

  it('has no surprise percent against a zero estimate', () => {
    expect(surprise(0.1, 0).surprisePercent).toBeNull();
  });
});
