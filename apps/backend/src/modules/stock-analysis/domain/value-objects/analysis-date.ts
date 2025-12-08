export class AnalysisDate {
  private constructor(public readonly value: Date) {}

  static of(date: Date): AnalysisDate {
    return new AnalysisDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }

  static today(): AnalysisDate {
    return AnalysisDate.of(new Date());
  }

  static forWeekly(date: Date): AnalysisDate {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return AnalysisDate.of(monday);
  }

  toISOString(): string {
    return this.value.toISOString().split('T')[0];
  }
}
