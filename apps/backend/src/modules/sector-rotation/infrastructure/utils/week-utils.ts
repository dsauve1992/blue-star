export class WeekUtils {
  static getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = WeekUtils.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  static getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
