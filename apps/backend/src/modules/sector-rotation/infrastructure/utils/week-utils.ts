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

  static getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setDate(d.getDate() - daysToMonday);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static isMonday(date: Date): boolean {
    return date.getDay() === 1;
  }

  /**
   * Returns the most recent Friday (market weekly close).
   * If today is Friday, returns today.
   * If today is Saturday/Sunday, returns the Friday that just passed.
   * If today is Monday–Thursday, returns the previous week's Friday.
   * This ensures we never include an incomplete trading week.
   */
  static getMostRecentFriday(now: Date): Date {
    const d = new Date(now);
    const day = d.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const daysToSubtract = day === 0 ? 2 : day >= 5 ? day - 5 : day + 2;
    d.setDate(d.getDate() - daysToSubtract);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
