export enum MonitoringType {
  BREAKOUT = 'BREAKOUT',
}

const VALID_TYPES = new Set(Object.values(MonitoringType));

export function isValidMonitoringType(value: string): value is MonitoringType {
  return VALID_TYPES.has(value as MonitoringType);
}
