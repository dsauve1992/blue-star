import {
  gaugeParticipation,
  trailingAverageRatios,
} from './participation-regime.service';

describe('gaugeParticipation', () => {
  it('returns null when no session has a ratio', () => {
    expect(gaugeParticipation([])).toBeNull();
    expect(gaugeParticipation([null, null])).toBeNull();
  });

  it('averages only the last five sessions', () => {
    const gauge = gaugeParticipation([0.1, 0.1, 0.8, 0.8, 0.8, 0.8, 0.8]);

    expect(gauge?.averageRatio).toBeCloseTo(0.8, 5);
    expect(gauge?.sampleSize).toBe(5);
  });

  it('skips sessions without a ratio when building the window', () => {
    const gauge = gaugeParticipation([0.2, null, 0.6, 0.6]);

    expect(gauge?.averageRatio).toBeCloseTo((0.2 + 0.6 + 0.6) / 3, 5);
    expect(gauge?.sampleSize).toBe(3);
  });

  it('is GREEN at or above 0.6', () => {
    expect(gaugeParticipation([0.6])?.regime).toBe('GREEN');
    expect(gaugeParticipation([0.9])?.regime).toBe('GREEN');
  });

  it('is RED below 0.4', () => {
    expect(gaugeParticipation([0.39])?.regime).toBe('RED');
  });

  it('is YELLOW between 0.4 inclusive and 0.6 exclusive', () => {
    expect(gaugeParticipation([0.4])?.regime).toBe('YELLOW');
    expect(gaugeParticipation([0.59])?.regime).toBe('YELLOW');
  });
});

describe('trailingAverageRatios', () => {
  it('gives each session the average of its trailing window', () => {
    const averages = trailingAverageRatios([0.2, 0.4, null, 0.6], 2);

    expect(averages[0]).toBeCloseTo(0.2, 5);
    expect(averages[1]).toBeCloseTo(0.3, 5);
    expect(averages[2]).toBeCloseTo(0.3, 5);
    expect(averages[3]).toBeCloseTo(0.5, 5);
  });

  it('is null until a session with a ratio appears', () => {
    expect(trailingAverageRatios([null, null, 0.7])).toEqual([null, null, 0.7]);
  });
});
