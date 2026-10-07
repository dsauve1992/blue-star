export class DateRange {
  private constructor(
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {}

  static of(startDate: Date, endDate: Date): DateRange {
    if (!startDate || !endDate) {
      throw new Error('Both start and end dates are required');
    }

    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw new Error('Dates must be valid Date objects');
    }

    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    // Check if end date is not in the future
    const today = new Date();
    if (endDate > today) {
      throw new Error('End date cannot be in the future');
    }

    return new DateRange(startDate, endDate);
  }

  static fromPositionEvents(events: Array<{ timestamp: string }>): DateRange {
    if (!events || events.length === 0) {
      throw new Error('At least one event is required to determine date range');
    }

    const timestamps = events.map((event) => new Date(event.timestamp));
    const startDate = new Date(Math.min(...timestamps.map((d) => d.getTime())));
    const endDate = new Date(Math.max(...timestamps.map((d) => d.getTime())));

    // Add some padding (30 days before first event, 7 days after last event)
    startDate.setDate(startDate.getDate() - 30);
    endDate.setDate(endDate.getDate() + 7);

    // Ensure end date is not in the future
    const today = new Date();
    if (endDate > today) {
      endDate.setTime(today.getTime());
    }

    return new DateRange(startDate, endDate);
  }

  getDaysDifference(): number {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  equals(other: DateRange): boolean {
    return (
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate.getTime() === other.endDate.getTime()
    );
  }
}
